/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { getPluginsStart } from '../../../kibana_services';

import './mapper_upload.scss';

export const MapperInformational: FC = () => {
  const { fileUpload } = getPluginsStart();

  if (fileUpload === undefined) {
    // eslint-disable-next-line no-console
    console.error('Ecs Mapper plugin not available');
    return null;
  }

  const maxFileSize = fileUpload.getMaxBytesFormatted();

  return (
    <EuiFlexGroup gutterSize="xl" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="xxl" type="addDataApp" className="ecs-mapper-informational__icon" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ecsMapper.file.informational.welcome"
              defaultMessage="ECS Mapper turns your mapping CSV into a starter ingest pipeline,
               for you to utilize or build upon. Reference&nbsp;{templateLink} for a sample mapping template."
              values={{
                templateLink: (
                  <EuiLink
                    href="https://docs.google.com/spreadsheets/d/1m5JiOTeZtUueW3VOVqS8bFYqNGEEyp0jAsgO12NFkNM/edit#gid=0"
                    target="_blank"
                  >
                    here
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ecsMapper.file.informational.instructions"
              defaultMessage="Please note that this tool generates starter pipelines. It will only 
              perform field rename and copy operations, as well as some field format adjustments. It's up to you to integrate them in a complete pipeline that ingests and outputs the data however you need."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.ecsMapper.file.informational.uploadedFilesAllowedSizeDescription"
              defaultMessage="You can upload files up to {maxFileSize}."
              values={{ maxFileSize }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
