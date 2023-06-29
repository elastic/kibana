/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { KafkaTopicWhenType, ValueOf } from '../../../../../../../common/types';

import { kafkaTopicWhenType } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaTopics: React.FunctionComponent<{ inputs: OutputFormInputsType }> = (
  props
) => {
  const { inputs } = props;
  const {
    props: { onChange },
    value: topics,
    formRowProps: { error: errors },
  } = inputs.kafkaTopicsInput;

  const [autoFocus, setAutoFocus] = useState(false);

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
      onChange(updatedTopics);
    },
    [topics, onChange]
  );

  const displayErrors = (errorMessages?: string[]) => {
    return errorMessages?.length
      ? errorMessages.map((item, idx) => <EuiFormErrorText key={idx}>{item}</EuiFormErrorText>)
      : null;
  };

  const matchErrorsByIndex = useMemo(
    () => (index: number) => {
      return errors?.filter((error) => error.index === index).map((error) => error.message);
    },
    [errors]
  );

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
          <></>
        </EuiFormRow>
      )}

      {topics.map((topic, index) => {
        const topicErrors = matchErrorsByIndex(index);
        return (
          <>
            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="none" wrap>
              <EuiFlexItem style={{ flex: '30%', paddingRight: 10 }}>
                <EuiFormRow fullWidth>
                  <EuiSelect
                    fullWidth
                    options={kafkaTopicWhenTypes}
                    value={topic.when?.type}
                    onChange={(e) => handleTopicProcessorChange(index, 'type', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ flex: '40%' }}>
                <EuiFormRow fullWidth>
                  <EuiFieldText
                    value={topic.when?.condition}
                    onChange={(e) => handleTopicProcessorChange(index, 'condition', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem grow={false} style={{ marginTop: 10 }}>
                <EuiButtonIcon
                  color="text"
                  onClick={() => deleteTopicProcessor(index)}
                  iconType="cross"
                  aria-label={i18n.translate('xpack.fleet.multiRowInput.deleteButton', {
                    defaultMessage: 'Delete row',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem
                style={{ flex: '0 53%', marginLeft: 'auto', marginRight: 23, paddingTop: 10 }}
              >
                <EuiFormRow
                  fullWidth
                  error={displayErrors(topicErrors)}
                  isInvalid={(topicErrors?.length ?? 0) > 0}
                >
                  <EuiFieldText
                    autoFocus={autoFocus}
                    prepend="Topic"
                    value={topic.topic}
                    onChange={(e) => handleTopicProcessorChange(index, 'topic', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        );
      })}

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
