/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, ReactNode } from 'react';
import {
  EuiHorizontalRule,
  EuiBadge,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';

import type { FormattedNerResp } from './ner_inference';

export const NerOutput: FC<{ result: FormattedNerResp }> = ({ result }) => {
  const lineSplit: JSX.Element[] = [];
  result.forEach(({ value, entity }) => {
    if (entity === null) {
      const lines = value
        .split(/(\n)/)
        .map((line) => (line === '\n' ? <br /> : <span>{line}</span>));

      lineSplit.push(...lines);
    } else {
      lineSplit.push(
        <EuiToolTip
          position="top"
          content={
            <div>
              <div>
                <EuiIcon
                  size="m"
                  type={getClassIcon(entity.class_name)}
                  style={{ marginRight: '2px', verticalAlign: 'text-top' }}
                />
                {value}
              </div>
              <EuiHorizontalRule margin="none" />
              <div style={{ fontSize: '12px', marginTop: '2px' }}>
                <div>Type: {getClassLabel(entity.class_name)}</div>
                <div>Probability: {entity.class_probability}</div>
              </div>
            </div>
          }
        >
          <EntityBadge entity={entity}>{value}</EntityBadge>
        </EuiToolTip>
      );
    }
  });
  return <div style={{ lineHeight: '24px' }}>{lineSplit}</div>;
};

const EntityBadge = ({
  entity,
  children,
}: {
  entity: estypes.MlTrainedModelEntities;
  children: ReactNode;
}) => (
  <EuiBadge
    color={getClassColor(entity.class_name)}
    style={{
      marginRight: '2px',
      marginTop: '-2px',
      border: `1px solid ${getClassColor(entity.class_name, true)}`,
      fontSize: '12px',
      padding: '0px 6px',
    }}
  >
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiIcon
          size="s"
          type={getClassIcon(entity.class_name)}
          style={{ marginRight: '2px', marginTop: '2px' }}
        />
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  </EuiBadge>
);

function getClassIcon(className: string) {
  switch (className) {
    case 'PER':
      return 'user';
    case 'LOC':
      return 'visMapCoordinate';

    default:
      return 'cross';
  }
}

function getClassLabel(className: string) {
  switch (className) {
    case 'PER':
      return 'Person';
    case 'LOC':
      return 'Location';

    default:
      return 'cross';
  }
}

function getClassColor(className: string, border: boolean = false) {
  switch (className) {
    case 'PER':
      return border ? '#D6BF57' : '#F1D86F';
    case 'LOC':
      return border ? '#6092C0' : '#79AAD9';

    default:
      return border ? '#D6BF57' : '#F1D86F';
  }
}
