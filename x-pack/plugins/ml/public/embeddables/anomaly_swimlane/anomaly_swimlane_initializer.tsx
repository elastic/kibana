/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { useMlLink } from '../../application/contexts/kibana';
import { ML_PAGES } from '../../../common/constants/locator';
import type { MlApi } from '../../application/services/ml_api_service';
import { extractInfluencers } from '../../../common/util/job_utils';
import { JobSelectorControl } from '../../alerting/job_selector';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import { SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import type { AnomalySwimLaneEmbeddableState, AnomalySwimlaneEmbeddableUserInput } from '..';
import { getDefaultSwimlanePanelTitle } from './anomaly_swimlane_embeddable';
import { getJobSelectionErrors } from '../utils';

export type ExplicitInput = AnomalySwimlaneEmbeddableUserInput;

export interface AnomalySwimlaneInitializerProps {
  initialInput?: Partial<
    Pick<AnomalySwimLaneEmbeddableState, 'jobIds' | 'swimlaneType' | 'viewBy' | 'perPage' | 'title'>
  >;
  onCreate: (swimlaneProps: ExplicitInput) => void;
  onCancel: () => void;
  adJobsApiService: MlApi['jobs'];
}

export const AnomalySwimlaneInitializer: FC<AnomalySwimlaneInitializerProps> = ({
  onCreate,
  onCancel,
  initialInput,
  adJobsApiService,
}) => {
  const isMounted = useMountedState();

  const titleManuallyChanged = useRef(!!initialInput?.title);

  const [jobIds, setJobIds] = useState(initialInput?.jobIds ?? []);

  const [influencers, setInfluencers] = useState<string[]>([VIEW_BY_JOB_LABEL]);

  useEffect(
    function updateInfluencers() {
      async function fetchInfluencers() {
        const jobs = await adJobsApiService.jobs(jobIds);
        if (isMounted()) {
          setInfluencers([...extractInfluencers(jobs), VIEW_BY_JOB_LABEL]);
        }
      }

      if (jobIds.length > 0) {
        fetchInfluencers();
      }
    },
    [adJobsApiService, isMounted, jobIds]
  );

  const [panelTitle, setPanelTitle] = useState(initialInput?.title ?? '');
  const [swimlaneType, setSwimlaneType] = useState<SwimlaneType>(
    initialInput?.swimlaneType ?? SWIMLANE_TYPE.OVERALL
  );
  const [viewBySwimlaneFieldName, setViewBySwimlaneFieldName] = useState(initialInput?.viewBy);

  useEffect(
    function updateDefaultTitle() {
      if (!titleManuallyChanged.current) {
        setPanelTitle(getDefaultSwimlanePanelTitle(jobIds));
      }
    },
    [initialInput?.title, jobIds]
  );

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

  const jobIdsErrors = getJobSelectionErrors(jobIds);

  const isFormValid =
    isPanelTitleValid &&
    !jobIdsErrors &&
    (swimlaneType === SWIMLANE_TYPE.OVERALL ||
      (swimlaneType === SWIMLANE_TYPE.VIEW_BY && !!viewBySwimlaneFieldName));

  const resultInput = {
    jobIds,
    panelTitle,
    swimlaneType,
    ...(viewBySwimlaneFieldName ? { viewBy: viewBySwimlaneFieldName } : {}),
  };

  const newJobUrl = useMlLink({ page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB });

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.ml.swimlaneEmbeddable.setupModal.title"
              defaultMessage="Anomaly swim lane configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <JobSelectorControl
            createJobUrl={newJobUrl}
            multiSelect
            jobsAndGroupIds={jobIds}
            adJobsApiService={adJobsApiService}
            onChange={(update) => {
              setJobIds([...(update?.jobIds ?? []), ...(update?.groupIds ?? [])]);
            }}
            errors={jobIdsErrors}
          />
          {jobIds.length > 0 ? (
            <>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.swimlaneEmbeddable.panelTitleLabel"
                    defaultMessage="Panel title"
                  />
                }
                isInvalid={!isPanelTitleValid}
                fullWidth
              >
                <EuiFieldText
                  id="panelTitle"
                  name="panelTitle"
                  value={panelTitle}
                  onChange={(e) => {
                    titleManuallyChanged.current = true;
                    setPanelTitle(e.target.value);
                  }}
                  isInvalid={!isPanelTitleValid}
                  fullWidth
                />
              </EuiFormRow>

              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.swimlaneEmbeddable.setupModal.swimlaneTypeLabel"
                    defaultMessage="Swim lane type"
                  />
                }
                fullWidth
              >
                <EuiButtonGroup
                  id="selectSwimlaneType"
                  name="selectSwimlaneType"
                  color="primary"
                  isFullWidth
                  legend={i18n.translate(
                    'xpack.ml.swimlaneEmbeddable.setupModal.swimlaneTypeLabel',
                    {
                      defaultMessage: 'Swim lane type',
                    }
                  )}
                  options={swimlaneTypeOptions}
                  idSelected={swimlaneType}
                  onChange={(id) => setSwimlaneType(id as SwimlaneType)}
                />
              </EuiFormRow>
            </>
          ) : null}

          {swimlaneType === SWIMLANE_TYPE.VIEW_BY && (
            <>
              <EuiFormRow
                label={
                  <FormattedMessage id="xpack.ml.explorer.viewByLabel" defaultMessage="View by" />
                }
                fullWidth
              >
                <EuiSelect
                  fullWidth
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
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>
              <FormattedMessage
                id="xpack.ml.swimlaneEmbeddable.setupModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton isDisabled={!isFormValid} onClick={onCreate.bind(null, resultInput)} fill>
              <FormattedMessage
                id="xpack.ml.swimlaneEmbeddable.setupModal.confirmButtonLabel"
                defaultMessage="Confirm"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
