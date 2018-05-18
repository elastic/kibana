/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
} from '@elastic/eui';

function Statement() {
  return (
    <li>hello! I am a <b>Statement</b>!</li>
  );
}

export function StatementSection({ iconType, headingText, statements }) {
  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
        >
          <EuiIcon
            type={iconType}
            size="m"
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          <EuiTitle size="m">
            <h3>{headingText}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <StatementList statements={statements} />
    </div>
  );
}

function StatementList({ statements }) {
  return (
    <ul>
      {
        statements.map(statement => (
          <Statement
            key={statement.id}
            statement={statement}
          />
        ))
      }
    </ul>
  );
}

// const StatementList = ({ statements, vertexSelected }) => (
//   statements.map((statement, index) => (
//     <Statement
//       statement={statement}
//       key={statement.id}
//       isTop={true}
//       isEvenChild={index + 1 % 2 === 0}
//       isLast={statements.length === index + 1}
//       vertexSelected={vertexSelected}
//     />
//   ))
// );

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
