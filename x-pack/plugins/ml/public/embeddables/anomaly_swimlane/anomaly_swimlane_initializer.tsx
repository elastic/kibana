/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
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
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';

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
  const [swimlaneType, setSwimlaneType] = useState<SWIMLANE_TYPE>(SWIMLANE_TYPE.OVERALL);
  const [viewBySwimlaneFieldName, setViewBySwimlaneFieldName] = useState();

  const swimlaneTypeOptions = [
    {
      id: SWIMLANE_TYPE.OVERALL,
      label: i18n.translate('xpack.ml.explorer.overallLabel', {
        defaultMessage: 'Overall',
      }),
    },
    {
      id: SWIMLANE_TYPE.VIEW_BY,
      label: i18n.translate('xpack.ml.explorer.viewByLabel', {
        defaultMessage: 'View by',
      }),
    },
  ];

  const viewBySwimlaneOptions = ['', ...influencers].map(influencer => {
    return {
      value: influencer,
      text: influencer,
    };
  });

  const isFormValid =
    swimlaneType === SWIMLANE_TYPE.OVERALL ||
    (swimlaneType === SWIMLANE_TYPE.VIEW_BY && !!viewBySwimlaneFieldName);

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
            <EuiButtonGroup
              id="selectSwimlaneType"
              name="selectSwimlaneType"
              color="primary"
              isFullWidth
              legend={i18n.translate('xpack.ml.swimlaneEmbeddable.setupModal.swimlaneTypeLabel', {
                defaultMessage: 'Swimlane type',
              })}
              options={swimlaneTypeOptions}
              idSelected={swimlaneType}
              onChange={id => setSwimlaneType(id as SWIMLANE_TYPE)}
            />
          </EuiFormRow>

          {swimlaneType === SWIMLANE_TYPE.VIEW_BY && (
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
