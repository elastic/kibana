/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty } from '@elastic/eui';
import { useMlKibana } from '../../../../contexts/kibana';
import type { MlSavedObjectType } from '../../../../../../common/types/saved_objects';

export const DocsLink: FC<{ currentTabId: MlSavedObjectType }> = ({ currentTabId }) => {
  const {
    services: {
      docLinks: {
        links: { ml },
      },
    },
  } = useMlKibana();

  let href = ml.anomalyDetectionJobs;
  let linkLabel = i18n.translate('xpack.ml.management.jobsList.anomalyDetectionDocsLabel', {
    defaultMessage: 'Anomaly detection jobs docs',
  });

  if (currentTabId === 'data-frame-analytics') {
    href = ml.dataFrameAnalytics;
    linkLabel = i18n.translate('xpack.ml.management.jobsList.analyticsDocsLabel', {
      defaultMessage: 'Analytics jobs docs',
    });
  } else if (currentTabId === 'trained-model') {
    href = ml.trainedModels;
    linkLabel = i18n.translate('xpack.ml.management.jobsList.trainedModelsDocsLabel', {
      defaultMessage: 'Trained models docs',
    });
  }
  return (
    <EuiButtonEmpty
      href={href}
      target="_blank"
      iconType="help"
      data-test-subj="mlDocumentationLink"
    >
      {linkLabel}
    </EuiButtonEmpty>
  );
};
