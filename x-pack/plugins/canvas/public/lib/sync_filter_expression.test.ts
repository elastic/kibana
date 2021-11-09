/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncFilterWithExpr, syncExprWithFilter } from './sync_filter_expression';

describe('syncFilterWithExpr', () => {
  it('should synchronize filter arguments with expression arguments (exactly)', () => {
    const expression =
      'demodata | dropdownControl valueColumn="project" filterColumn="project" filterGroup=null | render';
    const filter = 'exactly column="other_column" value="kibana" filterGroup="Some group"';

    expect(syncFilterWithExpr(expression, filter)).toEqual(
      'exactly column="project" value="kibana" filterGroup=null'
    );

    const expressionWithouFilterGroup =
      'demodata | dropdownControl valueColumn="project" filterColumn="project" | render';

    expect(syncFilterWithExpr(expressionWithouFilterGroup, filter)).toEqual(
      'exactly column="project" value="kibana" filterGroup="Some group"'
    );
  });

  it('should synchronize filter arguments with expression arguments (time)', () => {
    const expression = 'timefilterControl compact=true column=@timestamp filterGroup=null | render';
    const filter =
      'time column="other_column" from="2021-11-02 17:13:18" to="2021-11-09 17:13:18" filterGroup="Some group"';

    expect(syncFilterWithExpr(expression, filter)).toEqual(
      'time column="@timestamp" from="2021-11-02 17:13:18" to="2021-11-09 17:13:18" filterGroup=null'
    );

    const expressionWithoutFilterGroup =
      'timefilterControl compact=true column=@timestamp1 filterColumn="project" | render';

    expect(syncFilterWithExpr(expressionWithoutFilterGroup, filter)).toEqual(
      'time column="@timestamp1" from="2021-11-02 17:13:18" to="2021-11-09 17:13:18" filterGroup="Some group"'
    );
  });
});

describe('syncExprWithFilter', () => {
  const replaceNewLines = (str: string = '') => str.replace(/\n/g, ' ');

  it('should synchronize expression arguments with filter arguments (exactly)', () => {
    const expression =
      'demodata | dropdownControl valueColumn="project" filterColumn="project" filterGroup=null | render';
    const filter = 'exactly column="other_column" value="kibana" filterGroup="Some group"';
    const result = syncExprWithFilter(expression, filter);

    expect(replaceNewLines(result)).toEqual(
      'demodata | dropdownControl valueColumn="project" filterColumn="other_column" filterGroup="Some group" | render'
    );

    const filterWithoutFilterGroup = 'exactly column="other_column" value="kibana"';
    const result2 = syncExprWithFilter(expression, filterWithoutFilterGroup);

    expect(replaceNewLines(result2)).toEqual(
      'demodata | dropdownControl valueColumn="project" filterColumn="other_column" filterGroup=null | render'
    );
  });

  it('should synchronize expression arguments with filter arguments (time)', () => {
    const expression = 'timefilterControl compact=true column=@timestamp filterGroup=null | render';
    const filter =
      'time column="other_column" from="2021-11-02 17:13:18" to="2021-11-09 17:13:18" filterGroup="Some group"';

    const result = syncExprWithFilter(expression, filter);
    expect(replaceNewLines(result)).toEqual(
      'timefilterControl compact=true column="other_column" filterGroup="Some group" | render'
    );

    const filterWithoutFilterGroup =
      'time column="other_column" from="2021-11-02 17:13:18" to="2021-11-09 17:13:18" filterGroup=null';

    const result2 = syncExprWithFilter(expression, filterWithoutFilterGroup);
    expect(replaceNewLines(result2)).toEqual(
      'timefilterControl compact=true column="other_column" filterGroup=null | render'
    );
  });
});
