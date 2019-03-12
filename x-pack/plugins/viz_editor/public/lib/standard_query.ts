/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Col {
  op: string;
  arg?: any;
}

export type SelectionQuery = Col;

export interface StandardQuery {
  select?: SelectionQuery[];
  where?: SelectionQuery[];
  limit?: number;
}

export function queryToES(query: StandardQuery): any {
  return queryLimit(query, querySelect(query, queryWhere(query, {})));
}

function isEmpty(arr?: any[]) {
  return !arr || !arr.length;
}

function hasPath(path: string[], obj: any) {
  for (const x of path) {
    if (!obj || !obj.hasOwnProperty(x)) {
      return false;
    }
    obj = obj[x];
  }

  return true;
}

function partition(fn: any, arr: any[]) {
  return arr.reduce(
    (acc: any, x: any) => {
      const [left, right] = acc;

      if (fn(x)) {
        left.push(x);
      } else {
        right.push(x);
      }

      return acc;
    },
    [[], []]
  );
}

function assocPath(path: string[], val: any, obj: any) {
  function recurAssocPath(i: number, acc: any): any {
    if (i >= path.length) {
      return val;
    }

    const key = path[i];
    acc = acc || {};
    return {
      ...acc,
      [key]: recurAssocPath(i + 1, acc[key]),
    };
  }

  return recurAssocPath(0, obj);
}

function isPlainField(field: { op: string }) {
  return field.op === 'col';
}

const ops: any = {
  // TODO: support count(distinct col)
  // col: ({ arg }) => arg,
  // distinct: ({ arg }) => `DISTINCT ${arg}`,
  lte: ({ arg }: any, query: any) => {
    const [col, comp] = partition(({ op }: any) => op === 'col', arg);
    return {
      range: {
        [col.arg]: {
          from: null,
          to: comp.arg,
          include_lower: true,
          include_upper: true,
          boost: 1.0,
        },
      },
    };
  },
  lt: ({ arg }: any, query: any) => {
    const [col, comp] = partition(({ op }: any) => op === 'col', arg);
    return {
      range: {
        [col.arg]: {
          from: null,
          to: comp.arg,
          include_lower: false,
          include_upper: false,
          boost: 1.0,
        },
      },
    };
  },
  gte: ({ arg }: any, query: any) => {
    const [col, comp] = partition(({ op }: any) => op === 'col', arg);
    return {
      range: {
        [col.arg]: {
          from: comp.arg,
          to: null,
          include_lower: true,
          include_upper: true,
          boost: 1.0,
        },
      },
    };
  },
  gt: ({ arg }: any, query: any) => {
    const [[col], [comp]] = partition(({ op }: any) => op === 'col', arg);
    return {
      range: {
        [col.arg]: {
          from: comp.arg,
          to: null,
          include_lower: false,
          include_upper: false,
          boost: 1.0,
        },
      },
    };
  },
  count: (countOp: any, query: any) =>
    query.select
      .filter(({ op }: any) => op === 'col')
      .map(({ op, arg }: any) => ({
        [arg]: {
          terms: {
            field: arg,
            missing_bucket: true,
            order: 'asc',
          },
        },
      })),
  col: ({ arg }: any) => ({
    field: arg,
  }),
  sum: ({ arg }: any, query: any) => {
    return {
      sum: opToDSL(arg, query),
    };
  },
};

function opToDSL(op: any, query: any) {
  const fn = ops[op.op];

  if (!fn) {
    throw new Error(`Unsupported operation ${op.op}`);
  }

  return fn(op, query);
}

function aggregationsToDSL(aggFields: any[], query: any, esQuery: any) {
  const nonCount = aggFields.filter(f => f.op !== 'count');

  if (!nonCount.length) {
    return esQuery;
  }

  return assocPath(
    ['aggregations', 'groupby', 'aggregations'],
    nonCount.reduce((acc, op) => {
      const aggs = opToDSL(op, query);

      if (Array.isArray(aggs)) {
        aggs.forEach((agg: any) => Object.assign(acc, agg));
      } else {
        acc[op.alias || op.op] = opToDSL(op, query);
      }
      return acc;
    }, {}),
    esQuery
  );
}

function querySelect(query: StandardQuery, esQuery: any) {
  if (isEmpty(query.select)) {
    return esQuery;
  }

  const withoutSource = {
    ...esQuery,
    _source: false,
    stored_fields: '_none_',
  };

  const [plainFields, aggFields] = partition(isPlainField, query.select!);

  if (aggFields.length) {
    return aggregationsToDSL(aggFields, query, {
      ...withoutSource,
      aggregations: {
        groupby: {
          composite: {
            sources: plainFields.map(({ arg }: any) => ({
              [arg]: {
                terms: {
                  field: arg,
                  missing_bucket: true,
                  order: 'asc',
                },
              },
            })),
          },
        },
      },
    });
  }

  const docvalueFields = plainFields.map(({ arg }: any) => ({
    field: arg,
  }));

  return {
    ...withoutSource,
    docvalue_fields: docvalueFields,
  };
}

function queryWhere(query: StandardQuery, esQuery: any) {
  const { where } = query;
  if (!where || !where.length) {
    return esQuery;
  }

  return {
    ...esQuery,
    query: where.reduce((acc: any, op: any) => {
      return Object.assign(acc, opToDSL(op, query));
    }, {}),
  };
}

function queryLimit(query: StandardQuery, esQuery: any) {
  if (query.limit == null) {
    return esQuery;
  }

  if (hasPath(['aggregations', 'groupby', 'composite'], esQuery)) {
    return assocPath(['aggregations', 'groupby', 'composite', 'size'], query.limit, {
      ...esQuery,
      size: 0,
    });
  }

  return {
    ...esQuery,
    size: query.limit,
  };
}

// JSON.stringify(queryToES({
//   select: [{ op: 'col', arg: 'Carrier' }],
//   limit: 1000,
// }), null, 2);

// {
//   "_source": false,
//   "docvalue_fields": [
//     {
//       "field": "Carrier"
//     }
//   ],
//   "size": 1000
// }

// function isEmpty(arr) {
//   return !arr || !arr.length;
// }

// function isPlainField(field) {
//   return field.op === 'col';
// }

// function partition(fn, arr) {
//   return arr.reduce((acc, x) => {
//     const [left, right] = acc;

//     if (fn(x)) {
//       left.push(x);
//     } else {
//       right.push(x);
//     }

//     return acc;
//   }, [[], []]);
// }

// function hasPath(path, obj) {
//   for (const x of path) {
//     if (!obj || !obj.hasOwnProperty(x)) {
//       return false;
//     }
//     obj = obj[x];
//   }

//   return true;
// }

// function assocPath(path, val, obj) {
//   function recurAssocPath(i, acc) {
//     if (i >= path.length) {
//       return val;
//     }

//     const key = path[i];
//     acc = acc || {};
//     return {
//       ...acc,
//       [key]: recurAssocPath(i + 1, acc[key]),
//     };
//   }

//   return recurAssocPath(0, obj);
// }

// var ops = {
//   // TODO: supprot count(distinct col)
//   // col: ({ arg }) => arg,
//   // lit: ({ arg }) => JSON.stringify(arg),
//   // count: ({ arg }) => `COUNT(${arg ? opToSQL(arg) : '*'})`,
//   // distinct: ({ arg }) => `DISTINCT ${arg}`,
//   // gt: ({ arg: [left, right] }) => `${opToSQL(left)} > ${opToSQL(right)}`,
//   col: ({ arg }) => ({
//     field: arg,
//   }),
//   sum: ({ arg }) => {
//     return {
//       sum: opToDSL(arg),
//     };
//   },
// };

// function opToDSL(op) {
//   const fn = ops[op.op];

//   if (!fn) {
//     throw new Error(`Unsupported operation ${op.op}`);
//   }

//   return fn(op);
// }

// function aggregationsToDSL(aggFields, esQuery) {
//   const nonCount = aggFields.filter(f => f.op !== 'count');

//   if (!nonCount.length) {
//     return esQuery;
//   }

//   return assocPath(
//     ['aggregations', 'groupBy', 'aggregations'],
//     nonCount.reduce((acc, op) => {
//       acc[op.alias || op.op] = opToDSL(op);
//       return acc;
//     }, {}),
//     esQuery,
//   );
// }

// function queryToSelect(query, esQuery) {
//   if (isEmpty(query.select)) {
//     return esQuery;
//   }

//   const [plainFields, aggFields] = partition(isPlainField, query.select);

//   if (aggFields.length) {
//     return aggregationsToDSL(aggFields, {
//       ...esQuery,
//       _source: false,
//       aggregations: {
//         groupBy: {
//           composite: {
//             sources: plainFields.map(({ arg }) => ({
//               [arg]: {
//                 terms: {
//                   field: arg,
//                   missing_bucket: true,
//                   order: 'asc',
//                 },
//               },
//             })),
//           },
//         },
//       },
//     });
//   }

//   const docvalueFields = plainFields.map(({ arg }) => ({
//     field: arg,
//   }));

//   return {
//     ...esQuery,
//     _source: false,
//     docvalue_fields: docvalueFields,
//   };
// }

// function queryToLimit(query, esQuery) {
//   if (query.limit == null) {
//     return esQuery;
//   }

//   if (hasPath(['aggregations', 'groupBy', 'composite'], esQuery)) {
//     return assocPath(['aggregations', 'groupBy', 'composite', 'size'], query.limit, {
//       ...esQuery,
//       size: 0,
//     });
//   }

//   return {
//     ...esQuery,
//     size: query.limit,
//   };
// }

// function queryToES(query) {
//   const esQuery = {};
//   return queryToLimit(query, queryToSelect(query, esQuery));
// }

// JSON.stringify(queryToES({
//   select: [{ op: 'col', arg: 'Carrier' }, { op: 'count' }, { op: 'sum', arg: { op: 'col', arg: 'AvgTicketPrice' } }],
//   limit: 1000,
// }), null, 2);

// JSON.stringify(queryToES({
//   select: [{ op: 'col', arg: 'Carrier' }],
//   limit: 1000,
// }), null, 2);

// {
//   "_source": false,
//   "docvalue_fields": [
//     {
//       "field": "Carrier"
//     }
//   ],
//   "size": 1000
// }
