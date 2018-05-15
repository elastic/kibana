/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiPanel,
  EuiFlexGrid,
  //EuiSpacer,
  EuiButtonEmpty
} from '@elastic/eui';

const StatementStatsList = ({ stats }) => (
  stats.map(({ value, isHighlighted }, index) => (
    <div>
      <EuiFlexItem
        grow={false}
        key={index}
        className="statement__stat"
      >
        <StatOverview
          value={value}
          isHighlighted={isHighlighted}
        />
      </EuiFlexItem>
    </div>
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
  <div style={getStatStyle(isHighlighted)} >{value}</div>
);

export const PluginStatement = ({ statement, stats, vertexSelected, isEvenChild }) => (
  <li className={`statement ${isEvenChild ? 'evenStatement' : ''}`}>
    <div>
      <EuiPanel
        className="statement__body"
        paddingSize="s"
      >
        <div>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            className="statement__content"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem
                  grow={false}
                >
                  <EuiIcon className="statement__dot" type="dot" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="text"
                    flush="left"
                    onClick={vertexSelected}
                    size="xs"
                    className="statement__name"
                  >
                    <span className="statement__name">
                      {statement.name}
                    </span>
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {
                    statement.hasExplicitId &&
                    <span className="statement__explicitId">
                      {statement.id}
                    </span>
                  }
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {
                stats &&
                stats.length > 0 &&
                <EuiFlexGrid
                  gutterSize="none"
                >
                  <StatementStatsList
                    stats={stats}
                  />
                </EuiFlexGrid>
              }
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPanel>
    </div>
  </li>
);
