/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';

import { Statement } from './statement';

const StatementList = ({ statements, vertexSelected }) => (
  statements.map((statement, index) => (
    <Statement
      statement={statement}
      key={statement.id}
      isTop={true}
      isLast={statements.length === index + 1}
      vertexSelected={vertexSelected}
    />
  ))
);

const sectionFactory = (headerText, iconType, children, vertexSelected) => (
  {
    headerText,
    iconType,
    children: (
      <StatementList
        statements={children}
        vertexSelected={vertexSelected}
      />
    )
  }
);

export const getStatementListFromPipeline = ({ inputStatements, queue, filterStatements, outputStatements }, vertexSelected) => (
  [
    sectionFactory('Input Statements', 'logstashInput', inputStatements, vertexSelected),
    sectionFactory('Queue', 'logstashQueue', [queue], vertexSelected),
    sectionFactory('Filter Statements', 'logstashFilter', filterStatements, vertexSelected),
    sectionFactory('Output Statements', 'logstashOutput', outputStatements, vertexSelected)
  ]
);
