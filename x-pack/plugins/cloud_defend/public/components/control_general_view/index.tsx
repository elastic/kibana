/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import {
  getDefaultSelectorByType,
  getDefaultResponseByType,
  getTotalsByType,
} from '../../common/utils';
import {
  getInputFromPolicy,
  getYamlFromSelectorsAndResponses,
  getSelectorsAndResponsesFromYaml,
} from '../../../common/utils/helpers';
import { ViewDeps } from '../../types';
import { SelectorType, Selector, Response } from '../../../common';
import * as i18n from './translations';
import { ControlGeneralViewSelector } from '../control_general_view_selector';
import { ControlGeneralViewResponse } from '../control_general_view_response';
import { MAX_SELECTORS_AND_RESPONSES_PER_TYPE } from '../../common/constants';

interface AddSelectorButtonProps {
  type: 'Selector' | 'Response';
  onSelectType(type: SelectorType): void;
  selectors: Selector[];
  responses: Response[];
}

/**
 * dual purpose button for adding selectors and responses by type
 */
const AddButton = ({ type, onSelectType, selectors, responses }: AddSelectorButtonProps) => {
  const totalsByType = useMemo(() => getTotalsByType(selectors, responses), [responses, selectors]);
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const addFile = useCallback(() => {
    closePopover();
    onSelectType('file');
  }, [onSelectType]);

  const addProcess = useCallback(() => {
    closePopover();
    onSelectType('process');
  }, [onSelectType]);

  const isSelector = type === 'Selector';

  const items = [
    <EuiContextMenuItem
      key={`addFile${type}`}
      icon="document"
      onClick={addFile}
      disabled={totalsByType.file >= MAX_SELECTORS_AND_RESPONSES_PER_TYPE}
      data-test-subj={`cloud-defend-btnAddFile${type}`}
    >
      {isSelector ? i18n.fileSelector : i18n.fileResponse}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={`addProcess${type}`}
      icon="gear"
      onClick={addProcess}
      disabled={totalsByType.process >= MAX_SELECTORS_AND_RESPONSES_PER_TYPE}
      data-test-subj={`cloud-defend-btnAddProcess${type}`}
    >
      {isSelector ? i18n.processSelector : i18n.processResponse}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key={`addNetwork${type}`}
      icon="globe"
      disabled
      data-test-subj={`cloud-defend-btnAddNetwork${type}`}
    >
      {isSelector ? i18n.networkSelector : i18n.networkResponse}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id={`btnAdd${type}`}
      display="block"
      button={
        <EuiButton
          fullWidth
          color="primary"
          iconType="plusInCircle"
          onClick={onButtonClick}
          data-test-subj={`cloud-defend-btnAdd${type}`}
        >
          {isSelector ? i18n.addSelector : i18n.addResponse}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};

export const ControlGeneralView = ({ policy, onChange, show }: ViewDeps) => {
  const styles = useStyles();
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const { selectors, responses } = useMemo(() => {
    return getSelectorsAndResponsesFromYaml(configuration);
  }, [configuration]);

  const onUpdateYaml = useCallback(
    (newSelectors: Selector[], newResponses: Response[]) => {
      if (input?.vars?.configuration) {
        const isValid =
          !newSelectors.find((selector) => selector.hasErrors) &&
          !newResponses.find((response) => response.hasErrors);

        input.vars.configuration.value = getYamlFromSelectorsAndResponses(
          newSelectors,
          newResponses
        );

        onChange({ isValid, updatedPolicy: { ...policy } });
      }
    },
    [input?.vars?.configuration, onChange, policy]
  );

  const incrementName = useCallback(
    (name: string): string => {
      // increment name using ints
      const numberSuffix = name.search(/\d+$/);
      const newName =
        numberSuffix !== -1
          ? name.slice(0, numberSuffix) + (parseInt(name.slice(numberSuffix), 10) + 1)
          : name + '1';
      const dupe = selectors.find((selector) => selector.name === newName);

      if (dupe) {
        return incrementName(dupe.name);
      }

      return newName;
    },
    [selectors]
  );

  const onAddSelector = useCallback(
    (type: SelectorType) => {
      const newSelector = getDefaultSelectorByType(type);
      const dupe = selectors.find((selector) => selector.name === newSelector.name);

      if (dupe) {
        newSelector.name = incrementName(dupe.name);
      }

      selectors.push(newSelector);
      onUpdateYaml(selectors, responses);
    },
    [incrementName, onUpdateYaml, responses, selectors]
  );

  const onAddResponse = useCallback(
    (type: SelectorType) => {
      const newResponse = getDefaultResponseByType(type);
      responses.push(newResponse);
      onUpdateYaml(selectors, responses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onDuplicateSelector = useCallback(
    (selector: Selector) => {
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
    (response: Response) => {
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
    (updatedSelector: Selector, index: number) => {
      const old = selectors[index];

      if (updatedSelector.hasErrors === false) {
        delete updatedSelector.hasErrors;
      }

      const updatedSelectors: Selector[] = JSON.parse(JSON.stringify(selectors));
      let updatedResponses: Response[] = JSON.parse(JSON.stringify(responses));

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

      updatedSelectors[index] = JSON.parse(JSON.stringify(updatedSelector));
      onUpdateYaml(updatedSelectors, updatedResponses);
    },
    [onUpdateYaml, responses, selectors]
  );

  const onResponseChange = useCallback(
    (updatedResponse: Response, index: number) => {
      if (updatedResponse.hasErrors === false) {
        delete updatedResponse.hasErrors;
      }

      const updatedResponses: Response[] = JSON.parse(JSON.stringify(responses));
      updatedResponses[index] = JSON.parse(JSON.stringify(updatedResponse));
      onUpdateYaml(selectors, updatedResponses);
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
        const usedByResponse = !!responses.find(
          (response) =>
            response.match.includes(selector.name) || response?.exclude?.includes(selector.name)
        );

        return (
          <EuiFlexItem key={i}>
            <ControlGeneralViewSelector
              key={i}
              index={i}
              selector={selector}
              selectors={selectors}
              usedByResponse={usedByResponse}
              onDuplicate={onDuplicateSelector}
              onRemove={onRemoveSelector}
              onChange={onSelectorChange}
            />
          </EuiFlexItem>
        );
      })}

      <AddButton
        type="Selector"
        onSelectType={onAddSelector}
        selectors={selectors}
        responses={responses}
      />

      <EuiSpacer size="m" />

      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{i18n.responses}</h4>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.responsesHelp}
        </EuiText>
      </EuiFlexItem>

      {responses.map((response, i) => {
        return (
          <EuiFlexItem key={i}>
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
        );
      })}
      <AddButton
        type="Response"
        onSelectType={onAddResponse}
        selectors={selectors}
        responses={responses}
      />
      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
};
