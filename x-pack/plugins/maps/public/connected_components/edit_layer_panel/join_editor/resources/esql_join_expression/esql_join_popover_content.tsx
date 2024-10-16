/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiFormHelpText,
  EuiPopoverTitle,
  EuiSkeletonText,
  EuiSpacer,
  EuiComboBox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { LeftFieldSelector } from '../common/left_field_selector';
import { JoinField } from '../..';
import type {
  ESESQLTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { ESQLEditor, IOnEsqlChangeParams } from '../../../../../components/esql_editor';

// import { getIndexPatternService } from '../../../../../kibana_services';
// import { getGeoFields } from '../../../../../index_pattern_util';
// import { GeoIndexPatternSelect } from '../../../../../components/geo_index_pattern_select';
// import { GeoFieldSelect } from '../../../../../components/geo_field_select';
//
// import { inputStrings } from '../../../../input_strings';
// import { RelationshipExpression } from '../../../../../classes/layers/wizards/spatial_join_wizard';
// import { DEFAULT_WITHIN_DISTANCE } from '../../../../../classes/sources/join_sources';

interface Props {
  sourceDescriptor: Partial<ESESQLTermSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;

  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;
}

export function ESQLJoinPopoverContent(props: Props) {
  function onEsqlChange(params: IOnEsqlChangeParams) {
    console.log('on ESQL change');
    console.log(params);
  }

  function renderEsqlInput() {
    console.log('yow', props.leftValue);
    if (!props.leftValue) {
      return null;
    }
    return (
      <ESQLEditor
        verifyColumns={(columns) => {
          console.log('verify these columns', columns);
        }}
        onESQLChange={onEsqlChange}
        esql={props.sourceDescriptor.esql || ''}
      />
    );
  }

  console.log('render opopuver!');
  return (
    <div style={{ width: '800px' }}>
      <EuiPopoverTitle>
        {i18n.translate('xpack.maps.spatialJoinExpression.popoverTitle', {
          defaultMessage: 'Configure ES|QL join',
        })}
      </EuiPopoverTitle>
      <EuiFormHelpText className="mapJoinExpressionHelpText">
        <FormattedMessage
          id="xpack.maps.esqlTermJoinExpression.helpText"
          defaultMessage="Configure the shared key that combines layer features, the left source, with the results of an ES|QL expression, the right source."
        />
      </EuiFormHelpText>

      <LeftFieldSelector
        leftSourceName={props.leftSourceName}
        leftFields={props.leftFields}
        onLeftFieldChange={props.onLeftFieldChange}
        leftValue={props.leftValue}
      />

      {renderEsqlInput()}
    </div>
  );
}
