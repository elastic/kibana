/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';

import { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import { ThreatMatchComponent } from '../../../../common/components/threat_match';
import { BrowserField } from '../../../../common/containers/source';
import {
  FieldHook,
  Field,
  getUseField,
  UseField,
  getFieldValidityAndErrorMessage,
} from '../../../../shared_imports';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import { schema } from '../step_define_rule/schema';
import { QueryBarDefineRule } from '../query_bar';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

const CommonUseField = getUseField({ component: Field });

interface ThreatMatchInputProps {
  threatMapping: FieldHook;
  threatBrowserFields: Readonly<Record<string, Partial<BrowserField>>>;
  threatIndexPatterns: IndexPattern;
  indexPatterns: IndexPattern;
  threatIndexPatternsLoading: boolean;
}

const ThreatMatchInputComponent: React.FC<ThreatMatchInputProps> = ({
  threatMapping,
  indexPatterns,
  threatIndexPatterns,
  threatIndexPatternsLoading,
  threatBrowserFields,
}: ThreatMatchInputProps) => {
  const { setValue, value: threatItems } = threatMapping;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(threatMapping);
  const handleBuilderOnChange = useCallback(
    ({ entryItems }: { entryItems: ThreatMapEntries[] }): void => {
      setValue(entryItems);
    },
    [setValue]
  );
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={true}>
          <CommonUseField<string[], DefineStepRule>
            path="threatIndex"
            config={{
              ...schema.threatIndex,
              labelAppend: null,
            }}
            componentProps={{
              idAria: 'detectionEngineStepDefineRuleThreatMatchIndices',
              'data-test-subj': 'detectionEngineStepDefineRuleThreatMatchIndices',
              euiFieldProps: {
                fullWidth: true,
                isDisabled: false,
                placeholder: '',
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <UseField
            path="threatQueryBar"
            config={{
              ...schema.threatQueryBar,
              labelAppend: null,
            }}
            component={QueryBarDefineRule}
            componentProps={{
              browserFields: threatBrowserFields,
              idAria: 'detectionEngineStepDefineThreatRuleQueryBar',
              indexPattern: threatIndexPatterns,
              isDisabled: false,
              isLoading: threatIndexPatternsLoading,
              dataTestSubj: 'detectionEngineStepDefineThreatRuleQueryBar',
              openTimelineSearch: false,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={threatMapping.label}
        labelAppend={threatMapping.labelAppend}
        helpText={threatMapping.helpText}
        error={errorMessage}
        isInvalid={isInvalid}
        fullWidth
      >
        <ThreatMatchComponent
          listItems={threatItems as ThreatMapEntries[]}
          indexPatterns={indexPatterns}
          threatIndexPatterns={threatIndexPatterns}
          data-test-subj="threatmatch-builder"
          id-aria="threatmatch-builder"
          onChange={handleBuilderOnChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
};

export const ThreatMatchInput = React.memo(ThreatMatchInputComponent);
