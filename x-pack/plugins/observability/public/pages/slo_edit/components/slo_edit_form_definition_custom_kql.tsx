/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSuggest,
  EuiSuggestionProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFetchIndices } from '../../../hooks/use_fetch_indices';
import { SliType } from './slo_edit_form';

export interface SloDefinitionFormProps {
  sliType: SliType;
}

const sampleItems = [
  {
    type: { iconType: 'save', color: 'tint3' },
    label: 'Saved search',
  },
];

interface SloEditFormDefinitionCustomKqlProps {
  onCheckValidity: (validity: boolean) => void;
}

export function SloEditFormDefinitionCustomKql({
  onCheckValidity,
}: SloEditFormDefinitionCustomKqlProps) {
  const { loading, indices = [] } = useFetchIndices();

  const indicesNames = indices.map(({ name }) => ({
    type: { iconType: '', color: '' },
    label: name,
    description: '',
  }));

  const [selectedIndex, setSelectedIndex] = useState<string | undefined>();

  const isInvalid = useCallback(
    () =>
      selectedIndex ? !Boolean(indicesNames.find((index) => index.label === selectedIndex)) : false,
    [indicesNames, selectedIndex]
  );

  const handleFieldBlur = () => {};
  const handleFieldFocus = () => {};
  const handleItemClick = () => {};
  const handleInputChange = () => {};

  const handleChangeIndex = (index: EuiSuggestionProps) => {
    setSelectedIndex(index.label);
  };

  const handleChangeIndexInput = (index: string) => {
    setSelectedIndex(index);
  };

  useEffect(() => {
    if (selectedIndex) {
      if (isInvalid()) {
        onCheckValidity(false);
      } else {
        onCheckValidity(true);
      }
    } else {
      onCheckValidity(false);
    }
    return () => {
      onCheckValidity(false);
    };
  }, [isInvalid, onCheckValidity, selectedIndex]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.index', {
            defaultMessage: 'Index',
          })}
        </EuiFormLabel>
        <EuiSuggest
          fullWidth
          isClearable
          aria-label="Indices"
          status={loading ? 'loading' : selectedIndex ? 'unchanged' : 'unchanged'}
          onChange={handleChangeIndexInput}
          onItemClick={handleChangeIndex}
          isInvalid={isInvalid()}
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.index',
            {
              defaultMessage: 'Select an index',
            }
          )}
          value={selectedIndex}
          suggestions={indicesNames}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
        </EuiFormLabel>
        <EuiSuggest
          append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
          status="unchanged"
          aria-label="Filter"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.customFilter',
            {
              defaultMessage: 'Custom filter to apply on the index',
            }
          )}
          suggestions={sampleItems}
          onBlur={handleFieldBlur}
          onFocus={handleFieldFocus}
          onItemClick={handleItemClick}
          onChange={handleInputChange}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.goodQuery', {
            defaultMessage: 'Good query',
          })}
        </EuiFormLabel>
        <EuiSuggest
          append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
          status={'unchanged'}
          aria-label="Filter"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.goodQueryPlaceholder',
            {
              defaultMessage: 'Define the good events',
            }
          )}
          suggestions={sampleItems}
          onBlur={handleFieldBlur}
          onFocus={handleFieldFocus}
          onItemClick={handleItemClick}
          onChange={handleInputChange}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.sloDefinition.customKql.totalQuery', {
            defaultMessage: 'Total query',
          })}
        </EuiFormLabel>
        <EuiSuggest
          append={<EuiButtonEmpty>KQL</EuiButtonEmpty>}
          status={'unchanged'}
          aria-label="Filter"
          placeholder={i18n.translate(
            'xpack.observability.slos.sloEdit.sloDefinition.customKql.totalQueryPlaceholder',
            {
              defaultMessage: 'Define the total events',
            }
          )}
          suggestions={sampleItems}
          onBlur={handleFieldBlur}
          onFocus={handleFieldFocus}
          onItemClick={handleItemClick}
          onChange={handleInputChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
