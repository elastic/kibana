/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import yaml from 'js-yaml';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { getInputFromPolicy } from '../../common/utils';
import type { ControlSelector, ControlResponse, SettingsDeps } from '../../types';
import * as i18n from './translations';
import { ControlGeneralViewSelector } from '../control_general_view_selector';
import { ControlGeneralViewResponse } from '../control_general_view_response';

export const ControlGeneralView = ({ policy, onChange }: SettingsDeps) => {
  const styles = useStyles();
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const json = useMemo<{ selectors: ControlSelector[]; responses: ControlResponse[] }>(() => {
    try {
      return yaml.load(configuration);
    } catch {
      return { selectors: [], responses: [] };
    }
  }, [configuration]);

  const { selectors, responses } = json;

  const onUpdateYaml = useCallback(
    (newSelectors: ControlSelector[], newResponses: ControlResponse[]) => {
      if (input?.vars?.configuration) {
        const yml = yaml.dump({ selectors: newSelectors, responses: newResponses });
        input.vars.configuration.value = yml;
        onChange({ isValid: true, updatedPolicy: { ...policy } });
      }
    },
    [input?.vars?.configuration, onChange, policy]
  );

  const onDuplicateSelector = useCallback(
    (selector: ControlSelector) => {
      const duplicate = { ...selector };

      // increment name using ints
      const lastChar = parseInt(duplicate.name.slice(-1), 10);
      duplicate.name = isNaN(lastChar)
        ? duplicate.name + '1'
        : duplicate.name.slice(0, -1) + (lastChar + 1);
      selectors.push(duplicate);

      onUpdateYaml(selectors, responses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onRemoveSelector = useCallback(
    (selector: ControlSelector) => {
      const newSelectors = selectors.filter((sel) => sel !== selector);
      onUpdateYaml(newSelectors, responses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onDuplicateResponse = useCallback(
    (response: ControlResponse) => {
      const duplicate = { ...response };
      responses.push(duplicate);
      onUpdateYaml(selectors, responses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onRemoveResponse = useCallback(
    (response: ControlResponse) => {
      const newResponses = responses.filter((resp) => resp !== response);
      onUpdateYaml(selectors, newResponses);
    },
    [onUpdateYaml, responses, selectors]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{i18n.selectors}</h4>
        </EuiTitle>
        <EuiText color="subdued">{i18n.selectorsHelp}</EuiText>

        {selectors.map((selector, i) => {
          return (
            <ControlGeneralViewSelector
              key={i}
              selector={selector}
              selectors={selectors}
              onDuplicate={onDuplicateSelector}
              onRemove={onRemoveSelector}
            />
          );
        })}

        <EuiTitle size="xs">
          <h4>{i18n.responses}</h4>
        </EuiTitle>
        <EuiText color="subdued">{i18n.responsesHelp}</EuiText>

        {responses.map((response, i) => {
          return (
            <ControlGeneralViewResponse
              key={i}
              response={response}
              onRemove={onRemoveResponse}
              onDuplicate={onDuplicateResponse}
            />
          );
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
