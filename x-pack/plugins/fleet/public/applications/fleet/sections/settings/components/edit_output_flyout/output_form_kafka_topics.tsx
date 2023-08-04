/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import styled, { useTheme } from 'styled-components';

import type { EuiTheme } from '@kbn/kibana-react-plugin/common';

import type { KafkaTopicWhenType, ValueOf } from '../../../../../../../common/types';

import { kafkaTopicWhenType } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaTopics: React.FunctionComponent<{ inputs: OutputFormInputsType }> = (
  props
) => {
  const { inputs } = props;
  const {
    props: { onChange, id },
    value: topics,
    formRowProps: { error: errors },
  } = inputs.kafkaTopicsInput;
  const theme = useTheme() as EuiTheme;
  const [autoFocus, setAutoFocus] = useState(false);

  const indexedErrors = useMemo(() => {
    if (!errors) {
      return [];
    }
    return errors.reduce<string[][]>((acc, err) => {
      if (err.index === undefined) {
        return acc;
      }

      if (!acc[err.index]) {
        acc[err.index] = [];
      }

      if (!err.condition) {
        acc[err.index].push(err.message);
      }

      return acc;
    }, []);
  }, [errors]);

  const indexedConditionErrors = useMemo(() => {
    if (!errors) {
      return [];
    }
    return errors.reduce<string[][]>((acc, err) => {
      if (err.index === undefined) {
        return acc;
      }

      if (!acc[err.index]) {
        acc[err.index] = [];
      }

      if (err.condition) {
        acc[err.index].push(err.message);
      }

      return acc;
    }, []);
  }, [errors]);

  const handleTopicProcessorChange = useCallback(
    (index: number, field: 'topic' | 'condition' | 'type', value: string) => {
      const updatedPairs = [...topics];
      if (field === 'topic') {
        updatedPairs[index].topic = value;
      } else {
        updatedPairs[index].when = {
          ...(updatedPairs[index].when || {}),
          ...((field === 'condition' ? { condition: value } : {}) as { condition?: string }),
          ...((field === 'type' ? { type: value } : {}) as { type?: ValueOf<KafkaTopicWhenType> }),
        };
      }
      onChange(updatedPairs);
    },
    [topics, onChange]
  );

  const addTopicProcessor = useCallback(() => {
    setAutoFocus(true);
    const updatedTopics = [...topics, { topic: '', when: { type: kafkaTopicWhenType.Contains } }];
    onChange(updatedTopics);
  }, [topics, onChange]);

  const deleteTopicProcessor = useCallback(
    (index: number) => {
      const updatedTopics = topics.filter((_, i) => i !== index);
      indexedErrors.splice(index, 1);
      indexedConditionErrors.splice(index, 1);
      onChange(updatedTopics);
    },
    [topics, indexedErrors, indexedConditionErrors, onChange]
  );

  const displayErrors = (errorMessages?: string[]) => {
    return errorMessages?.length
      ? errorMessages.map((item, idx) => <EuiFormErrorText key={idx}>{item}</EuiFormErrorText>)
      : null;
  };

  const globalErrors = useMemo(() => {
    return errors && errors.filter((err) => err.index === undefined).map(({ message }) => message);
  }, [errors]);

  const kafkaTopicWhenTypes = useMemo(
    () =>
      (Object.keys(kafkaTopicWhenType) as Array<keyof typeof kafkaTopicWhenType>).map((type) => ({
        text: kafkaTopicWhenType[type],
        label: type,
      })),
    []
  );

  const DraggableDiv = styled.div`
    margin: ${(styledProps) => styledProps.theme.eui.euiSizeS};
  `;

  const onDragEndHandler = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(topics, source.index, destination.index);
        const sourceErrors = indexedErrors[source.index];
        indexedErrors.splice(source.index, 1);
        indexedErrors.splice(destination.index, 0, sourceErrors);
        const sourceConditionErrors = indexedConditionErrors[source.index];
        indexedConditionErrors.splice(source.index, 1);
        indexedConditionErrors.splice(destination.index, 0, sourceConditionErrors);
        onChange(items);
      }
    },
    [topics, indexedErrors, indexedConditionErrors, onChange]
  );

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaTopicsPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaHeaders">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaTopcisTitle"
            defaultMessage="Topics"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsDefaultTopicLabel"
            defaultMessage="Default topic"
          />
        }
        {...inputs.kafkaDefaultTopicInput.formRowProps}
      >
        <EuiFieldText
          data-test-subj="settingsOutputsFlyout.kafkaDefaultTopicInput"
          fullWidth
          {...inputs.kafkaDefaultTopicInput.props}
        />
      </EuiFormRow>

      {topics.length > 0 && (
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsProcessorsLabel"
              defaultMessage="Processors"
            />
          }
        >
          {topics.length > 1 ? (
            <EuiDragDropContext onDragEnd={onDragEndHandler}>
              <EuiDroppable droppableId={`${id}Droppable`} spacing="none">
                {topics.map((topic, index) => {
                  const topicErrors = indexedErrors[index];
                  const topicConditionErrors = indexedConditionErrors[index];
                  return (
                    <React.Fragment key={index}>
                      <EuiDraggable
                        spacing="m"
                        index={index}
                        draggableId={`${id}${index}Draggable`}
                        // isDragDisabled={disabled}
                        customDragHandle={true}
                        style={{
                          paddingLeft: 0,
                          paddingRight: 0,
                        }}
                      >
                        {(provided, state) => (
                          <>
                            <EuiSpacer size="s" />
                            <EuiFlexGroup
                              gutterSize="none"
                              wrap
                              style={
                                state.isDragging
                                  ? { background: theme.eui.euiPanelBackgroundColorModifiers.plain }
                                  : {}
                              }
                            >
                              <EuiFlexItem grow={false}>
                                <DraggableDiv
                                  data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorDragHandle${index}`}
                                  {...provided.dragHandleProps}
                                  aria-label={i18n.translate('xpack.fleet.settings.sortHandle', {
                                    defaultMessage: 'Sort host handle',
                                  })}
                                >
                                  <EuiIcon color="text" type="grab" />
                                </DraggableDiv>
                              </EuiFlexItem>

                              <EuiFlexItem style={{ flex: '30%', paddingRight: 10 }}>
                                <EuiFormRow fullWidth>
                                  <EuiSelect
                                    data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorWhenInput${index}`}
                                    fullWidth
                                    options={kafkaTopicWhenTypes}
                                    value={topic.when?.type}
                                    onChange={(e) =>
                                      handleTopicProcessorChange(index, 'type', e.target.value)
                                    }
                                  />
                                </EuiFormRow>
                              </EuiFlexItem>
                              <EuiFlexItem style={{ flex: '40%' }}>
                                <EuiFormRow
                                  fullWidth
                                  error={displayErrors(topicConditionErrors)}
                                  isInvalid={(topicConditionErrors?.length ?? 0) > 0}
                                >
                                  <EuiFieldText
                                    data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorConditionInput${index}`}
                                    value={topic.when?.condition}
                                    isInvalid={(topicConditionErrors?.length ?? 0) > 0}
                                    onChange={(e) =>
                                      handleTopicProcessorChange(index, 'condition', e.target.value)
                                    }
                                  />
                                </EuiFormRow>
                              </EuiFlexItem>

                              <EuiFlexItem grow={false} style={{ marginTop: 10 }}>
                                <EuiButtonIcon
                                  data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorDeleteButton${index}`}
                                  color="text"
                                  onClick={() => deleteTopicProcessor(index)}
                                  iconType="cross"
                                  aria-label={i18n.translate(
                                    'xpack.fleet.multiRowInput.deleteButton',
                                    {
                                      defaultMessage: 'Delete row',
                                    }
                                  )}
                                />
                              </EuiFlexItem>
                              <EuiFlexItem
                                style={{
                                  flex: '0 50%',
                                  marginLeft: 'auto',
                                  marginRight: 23,
                                  paddingTop: 10,
                                }}
                              >
                                <EuiFormRow
                                  fullWidth
                                  error={displayErrors(topicErrors)}
                                  isInvalid={(topicErrors?.length ?? 0) > 0}
                                >
                                  <EuiFieldText
                                    data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorTopicInput${index}`}
                                    autoFocus={autoFocus}
                                    prepend="Topic"
                                    value={topic.topic}
                                    isInvalid={(topicErrors?.length ?? 0) > 0}
                                    onChange={(e) =>
                                      handleTopicProcessorChange(index, 'topic', e.target.value)
                                    }
                                  />
                                </EuiFormRow>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </>
                        )}
                      </EuiDraggable>
                    </React.Fragment>
                  );
                })}
              </EuiDroppable>
            </EuiDragDropContext>
          ) : (
            <>
              {topics.map((topic, index) => {
                const topicErrors = indexedErrors[index];
                const topicConditionErrors = indexedConditionErrors[index];
                return (
                  <>
                    <EuiSpacer size="m" />

                    <EuiFlexGroup gutterSize="none" wrap>
                      <EuiFlexItem style={{ flex: '30%', paddingRight: 10 }}>
                        <EuiFormRow fullWidth>
                          <EuiSelect
                            data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorWhenInput${index}`}
                            fullWidth
                            options={kafkaTopicWhenTypes}
                            value={topic.when?.type}
                            onChange={(e) =>
                              handleTopicProcessorChange(index, 'type', e.target.value)
                            }
                          />
                        </EuiFormRow>
                      </EuiFlexItem>
                      <EuiFlexItem style={{ flex: '40%' }}>
                        <EuiFormRow
                          fullWidth
                          error={displayErrors(topicConditionErrors)}
                          isInvalid={(topicConditionErrors?.length ?? 0) > 0}
                        >
                          <EuiFieldText
                            data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorConditionInput${index}`}
                            value={topic.when?.condition}
                            isInvalid={(topicConditionErrors?.length ?? 0) > 0}
                            onChange={(e) =>
                              handleTopicProcessorChange(index, 'condition', e.target.value)
                            }
                          />
                        </EuiFormRow>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false} style={{ marginTop: 10 }}>
                        <EuiButtonIcon
                          data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorDeleteButton${index}`}
                          color="text"
                          onClick={() => deleteTopicProcessor(index)}
                          iconType="cross"
                          aria-label={i18n.translate('xpack.fleet.multiRowInput.deleteButton', {
                            defaultMessage: 'Delete row',
                          })}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem
                        style={{
                          flex: '0 53%',
                          marginLeft: 'auto',
                          marginRight: 23,
                          paddingTop: 10,
                        }}
                      >
                        <EuiFormRow
                          fullWidth
                          error={displayErrors(topicErrors)}
                          isInvalid={(topicErrors?.length ?? 0) > 0}
                        >
                          <EuiFieldText
                            data-test-subj={`settingsOutputsFlyout.kafkaTopicsProcessorTopicInput${index}`}
                            isInvalid={(topicErrors?.length ?? 0) > 0}
                            autoFocus={autoFocus}
                            prepend="Topic"
                            value={topic.topic}
                            onChange={(e) =>
                              handleTopicProcessorChange(index, 'topic', e.target.value)
                            }
                          />
                        </EuiFormRow>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                );
              })}
            </>
          )}
        </EuiFormRow>
      )}
      {displayErrors(globalErrors)}

      <EuiSpacer size="m" />
      <EuiButtonEmpty
        data-test-subj="fleetServerHosts.kafkaTopicsInput.addRowButton"
        size="xs"
        flush="left"
        iconType="plusInCircle"
        onClick={addTopicProcessor}
      >
        <FormattedMessage
          id="xpack.fleet.kafkaTopics.addTopicProcessor"
          defaultMessage="Add topic processor"
        />
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
    </EuiPanel>
  );
};
