/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiPanel,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  euiDragDropReorder,
  EuiSpacer,
} from '@elastic/eui';
import yaml from 'js-yaml';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { getInputFromPolicy } from '../../common/utils';
import {
  ControlSelector,
  ControlResponse,
  SettingsDeps,
  DefaultSelector,
  DefaultResponse,
} from '../../types';
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
        const isValid = !newSelectors.find((selector) => selector.hasErrors);

        // remove hasErrors prop prior to yaml conversion
        newSelectors.forEach((selector) => delete selector.hasErrors);

        const yml = yaml.dump({ selectors: newSelectors, responses: newResponses });
        input.vars.configuration.value = yml;

        onChange({ isValid, updatedPolicy: { ...policy } });
      }
    },
    [input?.vars?.configuration, onChange, policy]
  );

  const incrementName = useCallback(
    (name: string): string => {
      // increment name using ints
      const lastChar = parseInt(name.slice(-1), 10);
      const newName = isNaN(lastChar) ? name + '1' : name.slice(0, -1) + (lastChar + 1);
      const dupe = selectors.find((selector) => selector.name === newName);

      if (dupe) {
        return incrementName(dupe.name);
      }

      return newName;
    },
    [selectors]
  );

  const onAddSelector = useCallback(() => {
    const newSelector = { ...DefaultSelector };
    const dupe = selectors.find((selector) => selector.name === newSelector.name);

    if (dupe) {
      newSelector.name = incrementName(dupe.name);
    }

    selectors.push(newSelector);
    onUpdateYaml(selectors, responses);
  }, [incrementName, onUpdateYaml, responses, selectors]);

  const onAddResponse = useCallback(() => {
    const newResponse = { ...DefaultResponse };
    responses.push(newResponse);
    onUpdateYaml(selectors, responses);
  }, [onUpdateYaml, responses, selectors]);

  const onDuplicateSelector = useCallback(
    (selector: ControlSelector) => {
      const duplicate = { ...selector };

      duplicate.name = incrementName(duplicate.name);

      selectors.push(duplicate);

      onUpdateYaml(selectors, responses);
    },
    [incrementName, onUpdateYaml, responses, selectors]
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

  const onSelectorChange = useCallback(
    (updatedSelector: ControlSelector) => {
      selectors[selectors.indexOf(updatedSelector)] = updatedSelector;
      onUpdateYaml(selectors, responses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onResponseChange = useCallback(
    (updatedResponse: ControlResponse) => {
      responses[responses.indexOf(updatedResponse)] = updatedResponse;
      onUpdateYaml(selectors, responses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onResponseDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const reorderedResponses = euiDragDropReorder(responses, source.index, destination.index);
        onUpdateYaml(selectors, reorderedResponses);
      }
    },
    [onUpdateYaml, responses, selectors]
  );

  return (
    <EuiFlexGroup gutterSize="m" direction="column" data-test-subj="cloud-defend-generalview">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{i18n.selectors}</h4>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          {i18n.selectorsHelp}
        </EuiText>
      </EuiFlexItem>

      {selectors.map((selector, i) => {
        return (
          <EuiFlexItem key={i}>
            <ControlGeneralViewSelector
              key={i}
              selector={selector}
              selectors={selectors}
              onDuplicate={onDuplicateSelector}
              onRemove={onRemoveSelector}
              onChange={onSelectorChange}
            />
          </EuiFlexItem>
        );
      })}
      <EuiButton
        fullWidth
        color="primary"
        iconType="plusInCircle"
        onClick={onAddSelector}
        data-test-subj="cloud-defend-btnaddselector"
      >
        {i18n.addSelector}
      </EuiButton>

      <EuiSpacer size="m" />

      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{i18n.responses}</h4>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.responsesHelp}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiDragDropContext onDragEnd={onResponseDragEnd}>
          <EuiDroppable droppableId="cloudDefendControlResponses">
            {responses.map((response, i) => {
              return (
                <EuiDraggable
                  key={i}
                  css={styles.draggable}
                  index={i}
                  draggableId={i + ''}
                  customDragHandle={true}
                  hasInteractiveChildren={true}
                >
                  {(provided) => (
                    <EuiPanel paddingSize="m" hasShadow={false} color="subdued" css={styles.panel}>
                      <EuiFlexGroup direction="column">
                        <EuiFlexItem grow={false}>
                          <EuiPanel
                            color="transparent"
                            paddingSize="xs"
                            {...provided.dragHandleProps}
                            aria-label="Drag Handle"
                          >
                            <EuiIcon type="grab" />
                          </EuiPanel>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <ControlGeneralViewResponse
                            index={i}
                            response={response}
                            responses={responses}
                            selectors={selectors}
                            onRemove={onRemoveResponse}
                            onDuplicate={onDuplicateResponse}
                            onChange={onResponseChange}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  )}
                </EuiDraggable>
              );
            })}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiButton
          fullWidth
          color="primary"
          iconType="plusInCircle"
          onClick={onAddResponse}
          data-test-subj="cloud-defend-btnaddresponse"
        >
          {i18n.addResponse}
        </EuiButton>
        <EuiSpacer size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
