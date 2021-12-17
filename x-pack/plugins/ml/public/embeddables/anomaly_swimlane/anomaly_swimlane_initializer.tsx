/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiFieldText,
  EuiModal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SWIMLANE_TYPE, SwimlaneType } from '../../application/explorer/explorer_constants';
import { AnomalySwimlaneEmbeddableInput } from '..';

export interface AnomalySwimlaneInitializerProps {
  defaultTitle: string;
  influencers: string[];
  initialInput?: Partial<
    Pick<AnomalySwimlaneEmbeddableInput, 'jobIds' | 'swimlaneType' | 'viewBy' | 'perPage'>
  >;
  onCreate: (swimlaneProps: {
    panelTitle: string;
    swimlaneType: SwimlaneType;
    viewBy?: string;
  }) => void;
  onCancel: () => void;
}

export const AnomalySwimlaneInitializer: FC<AnomalySwimlaneInitializerProps> = ({
  defaultTitle,
  influencers,
  onCreate,
  onCancel,
  initialInput,
}) => {
  const [panelTitle, setPanelTitle] = useState(defaultTitle);
  const [swimlaneType, setSwimlaneType] = useState(
    initialInput?.swimlaneType ?? SWIMLANE_TYPE.OVERALL
  );
  const [viewBySwimlaneFieldName, setViewBySwimlaneFieldName] = useState(initialInput?.viewBy);

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

  const viewBySwimlaneOptions = ['', ...influencers].map((influencer) => {
    return {
      value: influencer,
      text: influencer,
    };
  });

  const isPanelTitleValid = panelTitle.length > 0;

  const isFormValid =
    isPanelTitleValid &&
    (swimlaneType === SWIMLANE_TYPE.OVERALL ||
      (swimlaneType === SWIMLANE_TYPE.VIEW_BY && !!viewBySwimlaneFieldName));

  return (
    <EuiModal initialFocus="[name=panelTitle]" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.title"
            defaultMessage="Anomaly swim lane configuration"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.swimlaneEmbeddable.panelTitleLabel"
                defaultMessage="Panel title"
              />
            }
            isInvalid={!isPanelTitleValid}
          >
            <EuiFieldText
              id="panelTitle"
              name="panelTitle"
              value={panelTitle}
              onChange={(e) => setPanelTitle(e.target.value)}
              isInvalid={!isPanelTitleValid}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.swimlaneEmbeddable.setupModal.swimlaneTypeLabel"
                defaultMessage="Swim lane type"
              />
            }
          >
            <EuiButtonGroup
              id="selectSwimlaneType"
              name="selectSwimlaneType"
              color="primary"
              isFullWidth
              legend={i18n.translate('xpack.ml.swimlaneEmbeddable.setupModal.swimlaneTypeLabel', {
                defaultMessage: 'Swim lane type',
              })}
              options={swimlaneTypeOptions}
              idSelected={swimlaneType}
              onChange={(id) => setSwimlaneType(id as SwimlaneType)}
            />
          </EuiFormRow>

          {swimlaneType === SWIMLANE_TYPE.VIEW_BY && (
            <>
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
                  onChange={(e) => setViewBySwimlaneFieldName(e.target.value)}
                />
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          isDisabled={!isFormValid}
          onClick={onCreate.bind(null, {
            panelTitle,
            swimlaneType,
            viewBy: viewBySwimlaneFieldName,
          })}
          fill
        >
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.confirmButtonLabel"
            defaultMessage="Confirm"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
