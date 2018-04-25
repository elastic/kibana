/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiSpacer,
  EuiButtonEmpty
} from '@elastic/eui';

const StatementStatsList = ({ stats }) => (
  stats.map(({ value, isHighlighted }, index) => (
    <EuiFlexItem
      grow={false}
      key={index}
    >
      <StatOverview
        value={value}
        isHighlighted={isHighlighted}
      />
    </EuiFlexItem>
  ))
);

const getStatStyle = isHighlighted => (
  {
    backgroundColor: isHighlighted
      ? 'orange'
      : 'transparent',
    borderRadius: "5px",
    padding: "2px"
  }
);

const StatOverview = ({ value, isHighlighted }) => (
  <span style={getStatStyle(isHighlighted)} >{value}</span>
);

export const PluginStatement = ({ statement, stats, vertexSelected }) => (
  <li className="statement">
    <div>
      <EuiPanel
        className="statement__content"
        paddingSize="s"
      >
        <EuiFlexGroup
          alignItems="flexStart"
          gutterSize="s"
        >
          <EuiFlexItem
            grow={false}
            style={{ padding: "0px", margin: "0px" }}
          >
            <EuiButtonEmpty
              color="text"
              flush="left"
              onClick={vertexSelected}
              size="xs"
            >
              <strong>{statement.name}</strong>
            </EuiButtonEmpty>
          </EuiFlexItem>
          {
            statement.hasExplicitId &&
            <EuiFlexItem
              grow={false}
              style={{ paddingTop: "1px" }}
            >
              <span>
                <em>{statement.id}</em>
              </span>
            </EuiFlexItem>
          }
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {
          stats &&
          stats.length > 0 &&
          <EuiFlexGroup>
            <StatementStatsList
              stats={stats}
            />
          </EuiFlexGroup>
        }
      </EuiPanel>
    </div>
  </li>
);
