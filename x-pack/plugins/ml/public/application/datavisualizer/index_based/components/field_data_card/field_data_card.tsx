/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React, { FC } from 'react';

import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';

import { FieldVisConfig } from '../../common';
import { FieldTitleBar } from '../../../../components/field_title_bar/index';
import {
  BooleanContent,
  DateContent,
  GeoPointContent,
  IpContent,
  KeywordContent,
  NotInDocsContent,
  NumberContent,
  OtherContent,
  TextContent,
} from './content_types';
import { LoadingIndicator } from './loading_indicator';
import { FileBasedFieldVisConfig, isIndexBasedFieldVisConfig } from '../../common/field_vis_config';

export interface FieldDataRowProps {
  config: FieldVisConfig | FileBasedFieldVisConfig;
}

export const FieldDataCard: FC<FieldDataRowProps> = ({ config }) => {
  const { fieldName, type } = config;

  function getCardContent() {
    if (isIndexBasedFieldVisConfig(config)) {
      if (config.existsInDocs === false) {
        return <NotInDocsContent />;
      }
    }

    switch (type) {
      case ML_JOB_FIELD_TYPES.NUMBER:
        if (fieldName !== undefined) {
          return <NumberContent config={config} />;
        } else {
          return null;
        }

      case ML_JOB_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} />;

      case ML_JOB_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case ML_JOB_FIELD_TYPES.GEO_POINT:
        return <GeoPointContent config={config} />;

      case ML_JOB_FIELD_TYPES.IP:
        return <IpContent config={config} />;

      case ML_JOB_FIELD_TYPES.KEYWORD:
        return <KeywordContent config={config} />;

      case ML_JOB_FIELD_TYPES.TEXT:
        return <TextContent config={config} />;

      default:
        return <OtherContent config={config} />;
    }
  }

  return (
    <EuiPanel
      data-test-subj={`mlFieldDataCard ${fieldName} ${type}`}
      className="mlFieldDataCard"
      hasShadow={false}
    >
      <FieldTitleBar card={config} />
      <div className="mlFieldDataCard__content" data-test-subj="mlFieldDataCardContent">
        {isIndexBasedFieldVisConfig(config) && config.loading === true ? (
          <LoadingIndicator />
        ) : (
          getCardContent()
        )}
      </div>
    </EuiPanel>
  );
};
