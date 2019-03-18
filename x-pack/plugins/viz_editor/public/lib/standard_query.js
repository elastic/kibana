/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, assocPath, partition } from 'lodash/fp';

const aggOps = {
  sum({ alias, arg: { op, arg } }) {
    if (op !== 'col') {
      throw new Error(`SUM only supports a single column as its argument.`);
    }

    return {
      [alias || `sum_${arg}`]: {
        sum: {
          field: arg,
        },
      },
    };
  },
  avg({ alias, arg: { op, arg } }) {
    if (op !== 'col') {
      throw new Error(`AVG only supports a single column as its argument.`);
    }

    return {
      [alias || `avg_${arg}`]: {
        avg: {
          field: arg,
        },
      },
    };
  },
  count({ alias, arg }) {
    if (isEmpty(arg)) {
      return {};
    }

    const { op, arg: field } = arg;

    if (op === 'distinct') {
      return {
        [alias || `count_distinct(${field})`]: {
          cardinality: {
            field,
          },
        },
      };
    }

    throw new Error(`Unrecognized argument to count: ${op}`);
  },
};

function isAggregationOp({ op }) {
  return aggOps.hasOwnProperty(op);
}

function esRange(col, clause) {
  const esBoolClause = {
    from: null,
    to: null,
    include_lower: false,
    include_upper: false,
    boost: 1.0,
  };

  return {
    range: {
      [col]: {
        ...esBoolClause,
        ...clause,
      },
    },
  };
}

const boolOps = {
  or: (args) => ({
    bool: {
      should: args.map(toEsBoolClause),
    },
  }),
  and: (args) => ({
    bool: {
      must: args.map(toEsBoolClause),
    },
  }),
  gt: (args) => {
    const [col, val] = parseComparison(args);
    return esRange(col, {
      from: val,
    });
  },
  gte: (args) => {
    const [col, val] = parseComparison(args);
    return esRange(col, {
      from: val,
      include_lower: true,
    });
  },
  lt: (args) => {
    const [col, val] = parseComparison(args);
    return esRange(col, {
      to: val,
    });
  },
  lte: (args) => {
    const [col, val] = parseComparison(args);
    return esRange(col, {
      to: val,
      include_upper: true,
    });
  },
  eq: (args) => {
    const [col, val] = parseComparison(args);
    return {
      term: {
        [col]: {
          value: val,
          boost: 1.0,
        },
      },
    };
  },
  ne: (args) => {
    return {
      bool: {
        must_not: [boolOps.eq(args)],
      },
    };
  },
};

function toEsBoolClause(clause) {
  const { op, arg } = clause;
  const fn = boolOps[op];

  if (!fn) {
    throw new Error(`Unrecognized boolean operation: ${op}`);
  }

  return fn(arg);
}

function parseComparison([a, b, ...etc]) {
  if (!isEmpty(etc)) {
    throw new Error(`A boolean condition currently cannot support more than two values.`);
  }

  const { op: op1, arg: arg1 } = a;
  const { op: op2, arg: arg2 } = b;

  if (op1 !== 'col' && op2 !== 'col') {
    throw new Error(`A boolean condition requires one column to be specified.`);
  }

  if (op1 !== 'lit' && op2 !== 'lit') {
    throw new Error(`A boolean condition requires one value to be specified.`);
  }

  return op1 === 'col' ? [arg1, arg2] : [arg2, arg1];
}

function toEsGroupBy(cols) {
  if (!cols.length) {
    return {
      filters: [{
        match_all: { boost: 1.0 },
      }],
    };
  }

  return {
    composite: {
      sources: cols.map(({ arg }) => ({
        [arg]: {
          terms: {
            field: arg,
            missing_bucket: true,
            order: 'asc',
          },
        },
      })),
    },
  };
}

function toEsAgg(agg) {
  const { op } = agg;
  const fn = aggOps[op];

  if (!fn) {
    throw new Error(`Unrecognized aggregation operation: ${op}`);
  }

  return fn(agg);
}

function toEsAggs(query, esQuery) {
  const [aggs, cols] = partition(isAggregationOp, query.select);
  const esAggs = Object.assign.apply({}, aggs.map(toEsAgg));
  const aggsQuery = isEmpty(esAggs) ? {} : { aggregations: esAggs };

  if (isEmpty(cols)) {
    return {
      ...esQuery,
      ...aggsQuery,
    };
  }

  return {
    ...esQuery,
    aggregations: {
      groupby: {
        ...toEsGroupBy(cols),
        ...aggsQuery,
      },
    }
  };
}

function hasAggregations(query) {
  return query.select && query.select.some(isAggregationOp);
}

function toEsRaw(query, esQuery) {
  return {
    ...esQuery,
    docvalue_fields: query.select.map(({ arg }) => ({ field: arg })),
  };
}

function select(query, esQuery) {
  const clause = query.select;

  if (isEmpty(clause)) {
    return esQuery;
  }

  const withoutSource = {
    ...esQuery,
    _source: false,
    stored_fields: '_none_',
  };

  return hasAggregations(query) ? toEsAggs(query, withoutSource) : toEsRaw(query, withoutSource);
}

function where(query, esQuery) {
  const clause = query.where;

  if (isEmpty(clause)) {
    return esQuery;
  }

  return {
    ...esQuery,
    query: toEsBoolClause(clause),
  };
}

// Update esQuery with the limit from the standard query
function limit(query, esQuery) {
  if (query.limit == null) {
    return esQuery;
  }

  if (hasAggregations(query)) {
    return {
      ...(assocPath(['aggregations', 'groupby', 'composite', 'size'], query.limit, esQuery)),
      size: 0,
    };
  }

  return {
    ...esQuery,
    size: query.limit,
  };
}

export function queryToES(query) {
  return limit(query, where(query, select(query, {})));
}
