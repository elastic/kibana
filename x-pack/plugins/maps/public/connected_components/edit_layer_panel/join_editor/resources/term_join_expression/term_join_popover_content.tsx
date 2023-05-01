/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormHelpText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataViewField } from '@kbn/data-views-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDataViewSelectPlaceholder } from '../../../../../../common/i18n_getters';
import { DEFAULT_MAX_BUCKETS_LIMIT } from '../../../../../../common/constants';
import {
  ESTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { SingleFieldSelect } from '../../../../../components/single_field_select';
import { ValidatedNumberInput } from '../../../../../components/validated_number_input';

import { getTermsFields } from '../../../../../index_pattern_util';
import { getIndexPatternSelectComponent } from '../../../../../kibana_services';
import type { JoinField } from '../../join_editor';

interface Props {
  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;

  // Right source props
  sourceDescriptor: Partial<ESTermSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;

  // Right field props
  rightValue: string;
  rightSize?: number;
  rightFields: DataViewField[];
  onRightFieldChange: (term?: string) => void;
  onRightSizeChange: (size: number) => void;
}

export function TermJoinPopoverContent(props: Props) {
  function onRightDataViewChange(indexPatternId?: string) {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    const { term, ...rest } = props.sourceDescriptor;
    props.onSourceDescriptorChange({
      ...rest,
      indexPatternId,
    });
  };

  function onLeftFieldChange(selectedFields: Array<EuiComboBoxOptionOption<JoinField>>) {
    if (selectedFields.length === 0) {
      return;
    }
    props.onLeftFieldChange(selectedFields[0].value.name);
  };

  function onRightFieldChange(term?: string) {
    if (!term || term.length === 0) {
      return;
    }

    props.onRightFieldChange(term);
  };

  function renderLeftFieldSelect() {
    const { leftValue, leftFields } = props;

    if (!leftFields) {
      return null;
    }

    const options = leftFields.map((field) => {
      return {
        value: field,
        label: field.label,
      };
    });

    let leftFieldOption;
    if (leftValue) {
      leftFieldOption = options.find((option) => {
        const field = option.value;
        return field.name === leftValue;
      });
    }
    const selectedOptions = leftFieldOption ? [leftFieldOption] : [];

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.leftFieldLabel', {
          defaultMessage: 'Left field',
        })}
        helpText={i18n.translate('xpack.maps.layerPanel.joinExpression.leftSourceLabelHelpText', {
          defaultMessage: 'Left source field that contains the shared key.',
        })}
      >
        <EuiComboBox
          placeholder={getSelectFieldPlaceholder()}
          singleSelection={true}
          isClearable={false}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onLeftFieldChange}
        />
      </EuiFormRow>
    );
  }

  function renderRightSourceSelect() {
    if (!props.leftValue) {
      return null;
    }
    const IndexPatternSelect = getIndexPatternSelectComponent();

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSourceLabel', {
          defaultMessage: 'Right source',
        })}
      >
        <IndexPatternSelect
          placeholder={getDataViewSelectPlaceholder()}
          indexPatternId={props.sourceDescriptor.indexPatternId}
          onChange={onRightDataViewChange}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  function renderRightFieldSelect() {
    if (!props.rightFields || !props.leftValue) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.rightFieldLabel', {
          defaultMessage: 'Right field',
        })}
        helpText={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSourceLabelHelpText', {
          defaultMessage: 'Right source field that contains the shared key.',
        })}
      >
        <SingleFieldSelect
          placeholder={getSelectFieldPlaceholder()}
          value={props.rightValue}
          onChange={onRightFieldChange}
          fields={getTermsFields(props.rightFields)}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  function renderRightFieldSizeInput() {
    if (props.rightValue || !props.leftValue) {
      return null;
    }

    return (
      <ValidatedNumberInput
        initialValue={
          props.rightSize !== undefined ? props.rightSize : DEFAULT_MAX_BUCKETS_LIMIT
        }
        min={1}
        max={DEFAULT_MAX_BUCKETS_LIMIT}
        onChange={props.onRightSizeChange}
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSizeLabel', {
          defaultMessage: 'Right size',
        })}
        helpText={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSizeHelpText', {
          defaultMessage: 'Right field term limit.',
        })}
      />
    );
  }

  const { leftSourceName } = props;
  return (
    <div style={{ width: 300 }}>
      <EuiPopoverTitle>
        <FormattedMessage
          id="xpack.maps.layerPanel.joinExpression.joinPopoverTitle"
          defaultMessage="Join"
        />
      </EuiPopoverTitle>
      <EuiFormHelpText className="mapJoinExpressionHelpText">
        <FormattedMessage
          id="xpack.maps.layerPanel.joinExpression.helpText"
          defaultMessage="Configure the shared key."
        />
      </EuiFormHelpText>
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.leftSourceLabel', {
          defaultMessage: 'Left source',
        })}
      >
        <EuiComboBox
          selectedOptions={
            leftSourceName ? [{ value: leftSourceName, label: leftSourceName }] : []
          }
          isDisabled
        />
      </EuiFormRow>
      {renderLeftFieldSelect()}

      {renderRightSourceSelect()}

      {renderRightFieldSelect()}

      {renderRightFieldSizeInput()}
    </div>
  );
}

function getSelectFieldPlaceholder() {
  return i18n.translate('xpack.maps.layerPanel.joinExpression.selectFieldPlaceholder', {
    defaultMessage: 'Select field',
  });
}
