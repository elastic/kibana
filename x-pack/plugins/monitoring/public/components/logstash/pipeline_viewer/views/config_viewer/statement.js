/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';

// import { formatMetric } from '../../../../../lib/format_number';

import { PluginStatement } from '../../models/pipeline/plugin_statement';
// import { Stat } from './stat';

import { IfStatement } from './if_statement';
// import { Queue } from './queue';

import {
  // EuiButtonEmpty,
  // EuiButtonIcon,
  // EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  // EuiTitle,
} from '@elastic/eui';

// const getDefaultStats = ({ pluginType, vertex }) => {
//   switch (pluginType) {
//     case 'input':
//       return [
//         new Stat(
//           formatMetric(vertex.latestEventsPerSecond, '0.[00]a', 'e/s emitted'),
//           vertex.isSlow()
//         )
//       ];
//     case 'filter':
//     case 'output':
//       return [
//         new Stat(
//           formatMetric(Math.round(vertex.percentOfTotalProcessorTime || 0), '0', '%', { prependSpace: false }),
//           vertex.isTimeConsuming()
//         ),
//         new Stat(
//           formatMetric(vertex.latestMillisPerEvent, '0.[00]a', 'ms/e'),
//           vertex.isSlow()
//         ),
//         new Stat(formatMetric(vertex.latestEventsPerSecond, '0.[00]a', 'e/s received'))
//       ];
//   }
//   return [];
// };

// export const Statement = ({ isLast, statement, vertexSelected, isEvenChild }) => {
//   const klass = statement.constructor.name;
//   const { vertex } = statement;

//   const handler = () => vertexSelected(vertex);
//   switch (klass) {
//     case 'IfStatement':
//       return (
//         <ul>
//           <IfStatement
//             isLast={isLast}
//             statement={statement}
//             vertexSelected={vertexSelected}
//           />
//         </ul>
//       );
//     case 'PluginStatement':
//       return (
//         <PluginStatement
//           statement={statement}
//           stats={getDefaultStats(statement)}
//           vertexSelected={handler}
//           isLast={isLast}
//           isEvenChild={isEvenChild}
//         />
//       );
//     case 'Queue':
//       return (
//         <Queue
//           statement={statement}
//           vertexSelected={handler}
//         />
//       );
//   }
// };

function pluginStatement(statement) {
  const {
    hasExplicitId,
    id,
    name,
  } = statement;
  return (
    <div className="cv-statement">
      <EuiFlexGroup
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="dot"
            color="#50b0a4"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span className="cv-statement__name">{name}</span>
        </EuiFlexItem>
        {
          hasExplicitId &&
          <EuiFlexItem grow={false}>
            <div className="cv-statement__id">
              {id}
            </div>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    </div>
  );
}

export class Statement extends React.PureComponent
{
  getNestingSpacers(depth) {
    const spacers = [];
    for (let i = 0; i < depth; i += 1) {
      spacers.push(<div className="cv-spacer" />);
    }
    return spacers;
  }

  getStatement(statement) {
    const {
      collapse,
      expand } = this.props;

    return statement instanceof PluginStatement
      ? pluginStatement(statement)
      : <IfStatement expand={expand} collapse={collapse} statement={statement} />;
  }

  render() {
    const {
      depth,
      // parentId,
      statement
    } = this.props.element;

    const spacers = this.getNestingSpacers(depth);

    const statementComponent = this.getStatement(statement);

    return (
      <li className="cv-list">
        <div className="cv-spaceContainer">
          {spacers}
        </div>
        <div className="cv-statement__content">
          {statementComponent}
        </div>
      </li>
    );
  }
}
