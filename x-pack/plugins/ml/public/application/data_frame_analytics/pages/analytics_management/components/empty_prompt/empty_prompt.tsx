/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import dfaImage from './data_frame_analytics_kibana.png';
import { useMlKibana } from '../../../../../contexts/kibana';

interface Props {
  disabled: boolean;
  onCreateFirstJobClick: () => void;
}

export const AnalyticsEmptyPrompt: FC<Props> = ({ disabled, onCreateFirstJobClick }) => {
  const {
    services: {
      docLinks,
      http: { basePath },
    },
  } = useMlKibana();
  const transformsLink = `${basePath.get()}/app/management/data/transform`;

  return (
    <EuiEmptyPrompt
      layout="horizontal"
      hasBorder={false}
      hasShadow={false}
      icon={
        <EuiImage
          size="fullWidth"
          src={dfaImage}
          alt={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
            defaultMessage: 'Create your first data frame analytics job',
          })}
        />
      }
      color="subdued"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.dataFrame.analyticsList.emptyPromptTitle"
            defaultMessage="Create your first data frame analytics job"
          />
        </h2>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.ml.overview.analyticsList.emptyPromptText"
              defaultMessage="Data frame analytics enables you to perform outlier detection, regression, or classification analysis and put the annotated data in a new index. The classification and regression trained models can also be used for inference in pipelines and aggregations."
            />
          </p>
          <EuiCallOut
            size="s"
            title={
              <FormattedMessage
                id="xpack.ml.overview.analyticsList.emptyPromptHelperText"
                defaultMessage="Data frame analytics requires specifically structured source data. Use {transforms} to create data frames before you create the jobs."
                values={{
                  transforms: (
                    <EuiLink href={transformsLink} target="blank" color={'accent'}>
                      <FormattedMessage
                        id="xpack.ml.overview.gettingStartedSectionTransforms"
                        defaultMessage="Elasticsearch's transforms"
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
            iconType="iInCircle"
          />
        </>
      }
      actions={[
        <EuiButton
          onClick={onCreateFirstJobClick}
          isDisabled={disabled}
          color="primary"
          iconType="plusInCircle"
          fill
          data-test-subj="mlAnalyticsCreateFirstButton"
        >
          {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptButtonText', {
            defaultMessage: 'Create job',
          })}
        </EuiButton>,
      ]}
      footer={
        <EuiFlexGroup gutterSize={'xs'} alignItems={'center'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.ml.common.learnMoreQuestion"
                  defaultMessage="Want to learn more?"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={docLinks.links.ml.dataFrameAnalytics} target="_blank" external>
              <FormattedMessage
                id="xpack.ml.common.readDocumentationLink"
                defaultMessage="Read documentation"
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      data-test-subj="mlNoDataFrameAnalyticsFound"
    />
  );
};
