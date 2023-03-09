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
  EuiDescribedFormGroup, 
  EuiFormRow, 
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiBasicTable,
  EuiPanel,
  EuiLink,
  EuiText, 
} from '@elastic/eui';

export const AggDescription: FC = memo(({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const onHelpClick = () => setIsHelpOpen((prevIsHelpOpen) => !prevIsHelpOpen);
  const closeHelp = () => setIsHelpOpen(false);

  const helpButton = <EuiButtonIcon onClick={onHelpClick} iconType="documentation" />;

  const columnsSidebar = [
    {
      field: 'function',
      name: 'Function',
      width: '100px',
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
      description: 'Detect anomalies when the number of events in a bucket is anomalous.',
    },
    {
      id: 1,
      function: 'non_zero_count, high_non_zero_count, low_non_zero_count',
      description: 'Detect anomalies when the number of events in a bucket is anomalous, but it ignores cases where the bucket count is zero.',
    },
    {
      id: 2,
      function: 'distinct_count, high_distinc_count, low_distinct_count',
      description: 'Detect anomalies where the number of distinct values in one field is unusual.',
    },
    {
      id: 3,
      function: 'lat_long',
      description: 'Detects anomalies in the geographic location of the input data.',
    },
    {
      id: 4,
      function: 'info_content, high_info_content, low_info_content',
      description: 'Detect anomalies in the amount of information that is contained in strings in a bucket.',
    },
    {
      id: 5,
      function: 'min',
      description: 'Detects anomalies in the arithmetic minimum of a value. The minimum value is calculated for each bucket.',
    },
    {
      id: 6,
      function: 'max',
      description: 'Detects anomalies in the arithmetic maximum of a value. The maximum value is calculated for each bucket.',
    },
    {
      id: 7,
      function: 'median, high_median, low_median',
      description: 'Detect anomalies in the statistical median of a value. The median value is calculated for each bucket.',
    },
    {
      id: 8,
      function: 'mean, high_mean, low_mean',
      description: 'Detect anomalies in the arithmetic mean of a value. The mean value is calculated for each bucket.',
    },
    {
      id: 9,
      function: 'metric',
      description: 'Combines min, max, and mean functions. You can use it as a shorthand for a combined analysis. If you do not specify a function in a detector, this is the default function.',
    },
    {
      id: 10,
      function: 'varp, high_varp, low_varp',
      description: 'Detect anomalies in the variance of a value which is a measure of the variability and spread in the data.',
    },
    {
      id: 11,
      function: 'rare',
      description: 'Detects anomalies according to the number of distinct rare values.',
    },
    {
      id: 12,
      function: 'freq_rare',
      description: 'Detects anomalies according to the number of times (frequency) rare values occur.',
    },
    {
      id: 13,
      function: 'sum, high_sum, low_sum',
      description: 'Detect anomalies where the sum of a field in a bucket is anomalous.',
    },
    {
      id: 14,
      function: 'non_null_sum, high_non_null_sum, low_non_null_sum',
      description: 'These functions are useful if your data is sparse. Buckets without values are ignored and buckets with a zero value are analyzed.',
    },
    {
      id: 15,
      function: 'time_of_day, time_of_week',
      description: 'Detect events that happen at unusual times, either of the day or of the week.',
    },
  ];
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.aggSelect.title',
    {
      defaultMessage: 'Function',
    }
  );
  return (
    (
      <>
        <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={<FormattedMessage
        id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.aggSelect.description"
        defaultMessage="Analysis functions to be performed. For example, sum, count." />} />
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
          {i18n.translate('mlAd.functions.popoverTitle', {
            defaultMessage: 'Functions',
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
            style={{ width: 350 }}
            tableCaption={i18n.translate('mlAd.functions.tableTitle', {
              defaultMessage: 'Description of functions',
            })}
            items={items}
            compressed={true}
            rowHeader="firstName"
            columns={columnsSidebar}
            responsive={false} />
        </EuiPanel>
        <EuiPanel color="transparent" paddingSize="s">
          <EuiText color="subdued" size="xs">
            <p>
              {i18n.translate('mlAd.functions.learnMoreText', {
                defaultMessage: 'Learn more about',
              })}
              &nbsp;
              <EuiLink href="https://www.elastic.co/guide/en/machine-learning/current/ml-functions.html">
                <FormattedMessage
                  id="mlAd.functions.learnMoreLink"
                  defaultMessage="functions." />
              </EuiLink>
            </p>
          </EuiText>
        </EuiPanel>
      </EuiPopover></>
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
  );
});

export const FieldDescription: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.fieldSelect.title',
    {
      defaultMessage: 'Field',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.fieldSelect.description"
          defaultMessage="Required for functions: sum, mean, median, max, min, info_content, distinct_count, lat_long."
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const ByFieldDescription: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.byFieldSelect.title',
    {
      defaultMessage: 'By field',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.byFieldSelect.description"
          defaultMessage="Required for individual analysis where anomalies are detected compared to an entity's own past behavior."
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const OverFieldDescription: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.overFieldSelect.title',
    {
      defaultMessage: 'Over field',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.overFieldSelect.description"
          defaultMessage="Required for population analysis where anomalies are detected compared to the behavior of the population."
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const PartitionFieldDescription: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.partitionFieldSelect.title',
    {
      defaultMessage: 'Partition field',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.partitionFieldSelect.description"
          defaultMessage="Allows segmentation of modeling into logical groups."
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const ExcludeFrequentDescription: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.excludeFrequent.title',
    {
      defaultMessage: 'Exclude frequent',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.excludeFrequent.description"
          defaultMessage="If set, it will automatically identify and exclude frequently occurring entities which may otherwise have dominated results."
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});

export const DescriptionDescription: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.description.title',
    {
      defaultMessage: 'Description',
    }
  );
  return (
    <EuiDescribedFormGroup
      fullWidth={true}
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.description.description"
          defaultMessage="Override the default detector description with a meaningful description of what the detector is analyzing."
        />
      }
    >
      <EuiFormRow fullWidth={true}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
