/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { ParsedFields } from '../../../../../../../common/search_strategy';
import { DraggableBadge } from '../../../../../../common/components/draggables';

export interface ThreatMatchRowProps {
  indicatorDataset: string;
  indicatorProvider: string;
  indicatorReference: string;
  indicatorType: string;
  sourceField: string;
  sourceValue: string;
}

const ThreatMatchRowContainer = ({ fields }: { fields: ParsedFields }) => {
  const props = {
    indicatorDataset: get(fields, 'event.dataset')[0] as string,
    indicatorReference: get(fields, 'event.reference')[0] as string,
    indicatorProvider: get(fields, 'provider')[0] as string,
    indicatorType: get(fields, 'matched.type')[0] as string,
    sourceField: get(fields, 'matched.field')[0] as string,
    sourceValue: get(fields, 'matched.atomic')[0] as string,
  };

  return <ThreatMatchRowView {...props} />;
};

export const ThreatMatchRowView = ({
  indicatorDataset,
  indicatorProvider,
  indicatorReference,
  indicatorType,
  sourceField,
  sourceValue,
}: ThreatMatchRowProps) => {
  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        direction="row"
        justifyContent="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={'hmm'}
            data-test-subj="threat-match-row-indicator-type"
            eventId={'mm'}
            field={'threat.indicator.matched.type'}
            value={indicatorType}
          />
        </EuiFlexItem>
        {'indicator matched on'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={'hmm'}
            data-test-subj="threat-match-row-source-field"
            eventId={'mm'}
            field={'threat.indicator.matched.field'}
            value={sourceField}
          />
        </EuiFlexItem>
        {', whose value was'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={'hmm'}
            data-test-subj="threat-match-row-source-value"
            eventId={'mm'}
            field={sourceField}
            value={sourceValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        alignItems="flexStart"
        data-test-subj="threat-match-row"
        direction="row"
        justifyContent="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={'hmm'}
            data-test-subj="threat-match-row-indicator-dataset"
            eventId={'mm'}
            field={'threat.indicator.event.dataset'}
            value={indicatorDataset}
          />
        </EuiFlexItem>
        {'via'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={'hmm'}
            data-test-subj="threat-match-row-indicator-provider"
            eventId={'mm'}
            field={'threat.indicator.provider'}
            value={indicatorProvider}
          />
        </EuiFlexItem>
        {':'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={'hmm'}
            data-test-subj="threat-match-row-indicator-reference"
            eventId={'mm'}
            field={'threat.indicator.event.reference'}
            value={indicatorReference}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export { ThreatMatchRowContainer as ThreatMatchRow };
