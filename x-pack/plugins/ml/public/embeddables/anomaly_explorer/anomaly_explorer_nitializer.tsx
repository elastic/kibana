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
import { FormattedMessage } from '@kbn/i18n/react';
import { SWIMLANE_TYPE, SwimlaneType } from '../../application/explorer/explorer_constants';
import { AnomalyExplorerEmbeddableInput } from '..';

export interface AnomalyExplorerInitializerProps {
  defaultTitle: string;
  influencers: string[];
  initialInput?: Partial<
    Pick<AnomalyExplorerEmbeddableInput, 'jobIds' | 'swimlaneType' | 'viewBy' | 'perPage'>
  >;
  onCreate: (swimlaneProps: {
    panelTitle: string;
    swimlaneType: SwimlaneType;
    viewBy?: string;
  }) => void;
  onCancel: () => void;
}

export const AnomalyExplorerInitializer: FC<AnomalyExplorerInitializerProps> = ({
  defaultTitle,
  influencers,
  onCreate,
  onCancel,
  initialInput,
}) => {
  const [panelTitle, setPanelTitle] = useState(defaultTitle);
  const [swimlaneType] = useState(initialInput?.swimlaneType ?? SWIMLANE_TYPE.VIEW_BY);
  const [viewByExplorerFieldName, setViewByExplorerFieldName] = useState(initialInput?.viewBy);

  const viewByExplorerOptions = ['', ...influencers].map((influencer) => {
    return {
      value: influencer,
      text: influencer,
    };
  });

  const isPanelTitleValid = panelTitle.length > 0;

  const isFormValid =
    isPanelTitleValid &&
    (swimlaneType === SWIMLANE_TYPE.OVERALL ||
      (swimlaneType === SWIMLANE_TYPE.VIEW_BY && !!viewByExplorerFieldName));

  return (
    <EuiModal initialFocus="[name=panelTitle]" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.setupModal.title"
            defaultMessage="Anomaly explorer configuration"
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
            label={<FormattedMessage id="xpack.ml.explorer.viewByLabel" defaultMessage="View by" />}
          >
            <EuiSelect
              id="selectViewBy"
              name="selectViewBy"
              options={viewByExplorerOptions}
              value={viewByExplorerFieldName}
              onChange={(e) => setViewByExplorerFieldName(e.target.value)}
            />
          </EuiFormRow>

          <></>
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
            viewBy: viewByExplorerFieldName,
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
