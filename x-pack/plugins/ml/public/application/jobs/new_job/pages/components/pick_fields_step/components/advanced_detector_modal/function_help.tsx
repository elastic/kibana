/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiBasicTable,
  EuiPanel,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { useMlKibana } from '../../../../../../../contexts/kibana';

export const FunctionHelpPopover: FC = memo(() => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const onHelpClick = () => setIsHelpOpen((prevIsHelpOpen) => !prevIsHelpOpen);
  const closeHelp = () => setIsHelpOpen(false);

  const helpButton = <EuiButtonIcon onClick={onHelpClick} iconType="documentation" />;

  const columnsSidebar = [
    {
      field: 'function',
      name: 'Function',
      width: '150px',
    },
    {
      field: 'description',
      name: 'Description',
    },
  ];

  const items = [
    {
      id: 0,
      function: 'count, high_count, low_count',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.count',
        {
          defaultMessage: 'Detect anomalies when the number of events in a bucket is anomalous.',
        }
      ),
    },
    {
      id: 1,
      function: 'non_zero_count, high_non_zero_count, low_non_zero_count',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.nonZeroCount',
        {
          defaultMessage:
            'Detect anomalies when the number of events in a bucket is anomalous, but ignore cases where the bucket count is zero.',
        }
      ),
    },
    {
      id: 2,
      function: 'distinct_count, high_distinct_count, low_distinct_count',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.distinctCount',
        {
          defaultMessage:
            'Detect anomalies where the number of distinct values in one field is unusual.',
        }
      ),
    },
    {
      id: 3,
      function: 'lat_long',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.latLong',
        {
          defaultMessage: 'Detect anomalies in the geographic location of the input data.',
        }
      ),
    },
    {
      id: 4,
      function: 'info_content, high_info_content, low_info_content',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.infoContent',
        {
          defaultMessage:
            'Detect anomalies in the amount of information that is contained in strings in a bucket.',
        }
      ),
    },
    {
      id: 5,
      function: 'min',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.min',
        {
          defaultMessage:
            'Detect anomalies in the arithmetic minimum of a value, which is calculated for each bucket.',
        }
      ),
    },
    {
      id: 6,
      function: 'max',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.max',
        {
          defaultMessage:
            'Detect anomalies in the arithmetic maximum of a value, which is calculated for each bucket.',
        }
      ),
    },
    {
      id: 7,
      function: 'median, high_median, low_median',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.median',
        {
          defaultMessage:
            'Detect anomalies in the statistical median of a value, which is calculated for each bucket.',
        }
      ),
    },
    {
      id: 8,
      function: 'mean, high_mean, low_mean',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.mean',
        {
          defaultMessage:
            'Detect anomalies in the arithmetic mean of a value, which is calculated for each bucket.',
        }
      ),
    },
    {
      id: 9,
      function: 'metric',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.metric',
        {
          defaultMessage:
            'Combine min, max, and mean functions. Use it as a shorthand for a combined analysis. This is the default function.',
        }
      ),
    },
    {
      id: 10,
      function: 'varp, high_varp, low_varp',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.varp',
        {
          defaultMessage:
            'Detect anomalies in the variance of a value which is a measure of the variability and spread in the data.',
        }
      ),
    },
    {
      id: 11,
      function: 'rare',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.rare',
        {
          defaultMessage: 'Detect anomalies according to the number of distinct rare values.',
        }
      ),
    },
    {
      id: 12,
      function: 'freq_rare',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.freqRare',
        {
          defaultMessage:
            'Detect anomalies according to the number of times (frequency) rare values occur.',
        }
      ),
    },
    {
      id: 13,
      function: 'sum, high_sum, low_sum',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.sum',
        {
          defaultMessage: 'Detect anomalies where the sum of a field in a bucket is anomalous.',
        }
      ),
    },
    {
      id: 14,
      function: 'non_null_sum, high_non_null_sum, low_non_null_sum',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.nonZeroCount',
        {
          defaultMessage:
            'These functions are useful if your data is sparse. Buckets without values are ignored and buckets with a zero value are analyzed.',
        }
      ),
    },
    {
      id: 15,
      function: 'time_of_day, time_of_week',
      description: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.functionHelp.time',
        {
          defaultMessage:
            'Detect events that happen at unusual times, either of the day or of the week.',
        }
      ),
    },
  ];

  return (
    <EuiPopover
      anchorPosition="rightUp"
      button={helpButton}
      isOpen={isHelpOpen}
      display="inlineBlock"
      panelPaddingSize="none"
      className="anomalyDetectionFunctionsHelp_popover"
      panelClassName="anomalyDetectionFunctionsHelp_panel"
      closePopover={closeHelp}
      initialFocus="#mlAdFunctionsHelpTableId"
    >
      <EuiPopoverTitle paddingSize="s">
        {i18n.translate('xpack.ml.anomalyDetection.functions.popoverTitle', {
          defaultMessage: 'Function reference',
        })}
      </EuiPopoverTitle>
      <EuiPanel
        className="eui-yScroll"
        style={{ maxHeight: '40vh' }}
        color="transparent"
        paddingSize="s"
      >
        <EuiBasicTable
          id="mlAdFunctionsHelpTableId"
          style={{ width: 400 }}
          tableCaption={i18n.translate('xpack.ml.anomalyDetection.functions.tableTitle', {
            defaultMessage: 'Description of functions',
          })}
          items={items}
          compressed={true}
          rowHeader="firstName"
          columns={columnsSidebar}
          responsive={false}
        />
      </EuiPanel>
      <EuiPanel color="transparent" paddingSize="s">
        <EuiText color="subdued" size="xs">
          <p>
            {i18n.translate('xpack.ml.anomalyDetection.functions.learnMoreText', {
              defaultMessage: 'Learn more about',
            })}
            &nbsp;
            <EuiLink href={docLinks.links.ml.anomalyDetectionFunctions}>
              <FormattedMessage
                id="xpack.ml.anomalyDetection.functions.learnMoreLink"
                defaultMessage="functions."
              />
            </EuiLink>
          </p>
        </EuiText>
      </EuiPanel>
    </EuiPopover>
  );
});
