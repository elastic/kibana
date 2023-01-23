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
  DefaultSelector,
  DefaultResponse,
  ViewDeps,
} from '../../types';
import * as i18n from './translations';
import { ControlGeneralViewSelector } from '../control_general_view_selector';
import { ControlGeneralViewResponse } from '../control_general_view_response';

export const ControlGeneralView = ({ policy, onChange, show }: ViewDeps) => {
  const styles = useStyles();
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const json = useMemo<{ selectors: ControlSelector[]; responses: ControlResponse[] }>(() => {
    try {
      const result = yaml.load(configuration);

      if (result) {
        return result;
      }
    } catch {
      // noop
    }

    return { selectors: [], responses: [] };
  }, [configuration]);

  const { selectors, responses } = json;

  const onUpdateYaml = useCallback(
    (newSelectors: ControlSelector[], newResponses: ControlResponse[]) => {
      if (input?.vars?.configuration) {
        const isValid =
          !newSelectors.find((selector) => selector.hasErrors) &&
          !newResponses.find((response) => response.hasErrors);

        // remove hasErrors prop prior to yaml conversion
        newSelectors.forEach((selector) => delete selector.hasErrors);
        newResponses.forEach((response) => delete response.hasErrors);

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
      const duplicate = JSON.parse(JSON.stringify(selector));

      duplicate.name = incrementName(duplicate.name);

      selectors.push(duplicate);

      onUpdateYaml(selectors, responses);
    },
    [incrementName, onUpdateYaml, responses, selectors]
  );

  const onRemoveSelector = useCallback(
    (index: number) => {
      const oldName = selectors[index].name;
      const newSelectors = [...selectors];
      newSelectors.splice(index, 1);

      // remove reference from all responses
      const updatedResponses = responses.map((r) => {
        const response = { ...r };
        const matchIndex = response.match.indexOf(oldName);

        if (matchIndex !== -1) {
          response.match.splice(matchIndex, 1);
        }

        if (response.exclude) {
          const excludeIndex = response.exclude.indexOf(oldName);

          if (excludeIndex !== -1) {
            response.exclude.splice(excludeIndex, 1);
          }
        }

        return response;
      });

      onUpdateYaml(newSelectors, updatedResponses);
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
    (index: number) => {
      const newResponses = [...responses];
      newResponses.splice(index, 1);
      onUpdateYaml(selectors, newResponses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onSelectorChange = useCallback(
    (updatedSelector: ControlSelector, index: number) => {
      const old = selectors[index];

      const updatedSelectors: ControlSelector[] = [...selectors];
      let updatedResponses: ControlResponse[] = [...responses];

      if (old.name !== updatedSelector.name) {
        // update all references to this selector in responses
        updatedResponses = responses.map((response) => {
          let oldNameIndex = response.match.indexOf(old.name);

          if (oldNameIndex !== -1) {
            response.match[oldNameIndex] = updatedSelector.name;
          }

          if (response.exclude) {
            oldNameIndex = response.exclude.indexOf(old.name);

            if (oldNameIndex !== -1) {
              response.exclude[oldNameIndex] = updatedSelector.name;
            }
          }

          return response;
        });
      }

      updatedSelectors[index] = updatedSelector;
      onUpdateYaml(updatedSelectors, updatedResponses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onResponseChange = useCallback(
    (updatedResponse: ControlResponse, index: number) => {
      const updatedResponses: ControlResponse[] = [...responses];

      updatedResponses[index] = updatedResponse;
      onUpdateYaml(selectors, updatedResponses);
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
    <EuiFlexGroup
      css={!show && styles.hide}
      gutterSize="m"
      direction="column"
      data-test-subj="cloud-defend-generalview"
    >
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
              index={i}
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
