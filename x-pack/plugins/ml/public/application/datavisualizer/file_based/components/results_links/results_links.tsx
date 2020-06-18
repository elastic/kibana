/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import { ml } from '../../../../services/ml_api_service';
import { isFullLicense } from '../../../../license';
import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';
import { useMlKibana } from '../../../../contexts/kibana';

const RECHECK_DELAY_MS = 3000;

interface Props {
  index: string;
  indexPatternId: string;
  timeFieldName?: string;
  createIndexPattern: boolean;
  showFilebeatFlyout(): void;
}

export const ResultsLinks: FC<Props> = ({
  index,
  indexPatternId,
  timeFieldName,
  createIndexPattern,
  showFilebeatFlyout,
}) => {
  const [duration, setDuration] = useState({
    from: 'now-30m',
    to: 'now',
  });
  const [showCreateJobLink, setShowCreateJobLink] = useState(false);
  const [globalStateString, setGlobalStateString] = useState('');
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  useEffect(() => {
    setShowCreateJobLink(checkPermission('canCreateJob') && mlNodesAvailable());
    updateTimeValues();
  }, []);

  useEffect(() => {
    const _g =
      timeFieldName !== undefined
        ? `&_g=(time:(from:'${duration.from}',mode:quick,to:'${duration.to}'))`
        : '';
    setGlobalStateString(_g);
  }, [duration]);

  async function updateTimeValues(recheck = true) {
    if (timeFieldName !== undefined) {
      const { from, to } = await getFullTimeRange(index, timeFieldName);
      setDuration({
        from: from === null ? duration.from : from,
        to: to === null ? duration.to : to,
      });

      // these links may have been drawn too quickly for the index to be ready
      // to give us the correct start and end times.
      // especially if the data was small.
      // so if the start and end were null, try again in 3s
      if (recheck && (from === null || to === null)) {
        setTimeout(() => {
          updateTimeValues(false);
        }, RECHECK_DELAY_MS);
      }
    }
  }

  return (
    <EuiFlexGroup gutterSize="l">
      {createIndexPattern && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`discoverApp`} />}
            title={
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.resultsLinks.viewIndexInDiscoverTitle"
                defaultMessage="View index in Discover"
              />
            }
            description=""
            href={`${basePath.get()}/app/discover#/?&_a=(index:'${indexPatternId}')${globalStateString}`}
          />
        </EuiFlexItem>
      )}

      {isFullLicense() === true &&
        timeFieldName !== undefined &&
        showCreateJobLink &&
        createIndexPattern && (
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`machineLearningApp`} />}
              title={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.resultsLinks.createNewMLJobTitle"
                  defaultMessage="Create new ML job"
                />
              }
              description=""
              href={`#/jobs/new_job/step/job_type?index=${indexPatternId}${globalStateString}`}
            />
          </EuiFlexItem>
        )}

      {createIndexPattern && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`dataVisualizer`} />}
            title={
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.resultsLinks.openInDataVisualizerTitle"
                defaultMessage="Open in Data Visualizer"
              />
            }
            description=""
            href={`#/jobs/new_job/datavisualizer?index=${indexPatternId}${globalStateString}`}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`managementApp`} />}
          title={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.resultsLinks.indexManagementTitle"
              defaultMessage="Index Management"
            />
          }
          description=""
          href={`${basePath.get()}/app/management/data/index_management/indices/filter/${index}`}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`managementApp`} />}
          title={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.resultsLinks.indexPatternManagementTitle"
              defaultMessage="Index Pattern Management"
            />
          }
          description=""
          href={`${basePath.get()}/app/management/kibana/indexPatterns${
            createIndexPattern ? `/patterns/${indexPatternId}` : ''
          }`}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`filebeatApp`} />}
          title={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.resultsLinks.fileBeatConfig"
              defaultMessage="Create Filebeat configuration"
            />
          }
          description=""
          onClick={showFilebeatFlyout}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

async function getFullTimeRange(index: string, timeFieldName: string) {
  const query = { bool: { must: [{ query_string: { analyze_wildcard: true, query: '*' } }] } };
  const resp = await ml.getTimeFieldRange({
    index,
    timeFieldName,
    query,
  });

  return {
    from: moment(resp.start.epoch).toISOString(),
    to: moment(resp.end.epoch).toISOString(),
  };
}
