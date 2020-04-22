/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export interface AnomalySwimlaneInitializerProps {
  influencers: string[];
  onCreate: (swimlaneProps: { swimlaneType: string; viewBy?: string }) => void;
  onCancel: () => void;
}

export const AnomalySwimlaneInitializer: FC<AnomalySwimlaneInitializerProps> = ({
  influencers,
  onCreate,
  onCancel,
}) => {
  const [swimlaneType, setSwimlaneType] = useState('');
  const [viewBySwimlaneFieldName, setViewBySwimlaneFieldName] = useState();

  const isFormValid = !!swimlaneType;

  const swimlaneTypeOptions = [
    {
      value: 'overall',
      text: i18n.translate('xpack.ml.swimlaneEmbeddable.setupModal.overallOptionLabel', {
        defaultMessage: 'Overall',
      }),
    },
    {
      value: 'viewBy',
      text: i18n.translate('xpack.ml.swimlaneEmbeddable.setupModal.viewByOptionLabel', {
        defaultMessage: 'viewBy',
      }),
    },
  ];

  const viewBySwimlaneOptions = influencers.map(influencer => {
    return {
      value: influencer,
      text: influencer,
    };
  });

  return (
    <div>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.title"
            defaultMessage="Anomaly swimlane configuration"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.swimlaneEmbeddable.setupModal.swimlaneTypeLabel"
                defaultMessage="Swimlane type"
              />
            }
          >
            <EuiSelect
              id="selectSwimlaneType"
              name="selectSwimlaneType"
              options={swimlaneTypeOptions}
              value={swimlaneType}
              onChange={e => setSwimlaneType(e.target.value)}
              data-test-subj="mlSwimlaneTypeCombobox"
            />
          </EuiFormRow>

          {swimlaneType === 'viewBy' && (
            <EuiFormRow
              label={
                <FormattedMessage id="xpack.ml.explorer.viewByLabel" defaultMessage="View by" />
              }
            >
              <EuiSelect
                id="selectViewBy"
                name="selectViewBy"
                options={viewBySwimlaneOptions}
                value={viewBySwimlaneFieldName}
                onChange={e => setViewBySwimlaneFieldName(e.target.value)}
              />
            </EuiFormRow>
          )}
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>

        <EuiButton
          isDisabled={!isFormValid}
          onClick={onCreate.bind(null, { swimlaneType, viewBy: viewBySwimlaneFieldName })}
          fill
        >
          Create
        </EuiButton>
      </EuiModalFooter>
    </div>
  );
};
