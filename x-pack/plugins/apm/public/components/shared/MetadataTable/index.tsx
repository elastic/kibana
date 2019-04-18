/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
import { get, has } from 'lodash';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { StringMap } from '../../../../typings/common';
import { DottedKeyValueTable } from '../DottedKeyValueTable';
import { Span } from '../../../../typings/es_schemas/ui/Span';

type MetadataItem = Transaction | APMError | Span;

interface Props {
  item: MetadataItem;
  sections: MetadataSection[];
}

export interface MetadataSection {
  key: string;
  label: string;
  required?: boolean;
}

export function MetadataTable({ item, sections }: Props) {
  const filteredSections = filterSections(item, sections);
  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiLink href="/something">
            <EuiText size="s">
              <EuiIcon type="help" /> How to add labels and other data
            </EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {filteredSections.map(section => (
        <div key={section.key}>
          <EuiTitle size="xs">
            <h6>{section.label}</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <Section propData={get(item, section.key)} propKey={section.key} />
          <EuiSpacer size="xl" />
        </div>
      ))}
    </React.Fragment>
  );
}

function filterSections(item: MetadataItem, sections: MetadataSection[]) {
  return sections.filter(({ key, required }) => required || has(item, key));
}

function Section({
  propData,
  propKey
}: {
  propData?: StringMap;
  propKey?: string;
}) {
  return (
    <React.Fragment>
      {propData ? (
        <DottedKeyValueTable data={propData} parentKey={propKey} maxDepth={5} />
      ) : (
        <EuiText size="s">
          {i18n.translate(
            'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
            { defaultMessage: 'No data available' }
          )}
        </EuiText>
      )}
    </React.Fragment>
  );
}
