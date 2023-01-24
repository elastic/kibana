/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiSelect,
} from '@elastic/eui';

import { SlmPolicyPayload } from '../../../../../common/types';
import { TIME_UNITS } from '../../../../../common/constants';
import { StepProps } from '.';
import { textService } from '../../../services/text';
import { useCore } from '../../../app_context';

const getExpirationTimeOptions = (unitSize = '0') =>
  Object.entries(TIME_UNITS).map(([_key, value]) => ({
    text: textService.getTimeUnitLabel(value, unitSize),
    value,
  }));

export const PolicyStepRetention: React.FunctionComponent<StepProps> = ({
  policy,
  updatePolicy,
  errors,
}) => {
  const { retention = {} } = policy;
  const { docLinks } = useCore();

  const updatePolicyRetention = (
    updatedFields: Partial<SlmPolicyPayload['retention']>,
    validationHelperData = {}
  ): void => {
    const newRetention = { ...retention, ...updatedFields };
    updatePolicy(
      {
        retention: newRetention,
      },
      validationHelperData
    );
  };

  // State for touched inputs
  const [touched, setTouched] = useState({
    expireAfterValue: false,
    minCount: false,
    maxCount: false,
  });

  const renderExpireAfterField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepRetention.expirationTitle"
              defaultMessage="Expiration"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepRetention.expirationDescription"
          defaultMessage="The time to wait before deleting snapshots."
        />
      }
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepRetention.expireAfterLabel"
            defaultMessage="Delete after"
          />
        }
        isInvalid={touched.expireAfterValue && Boolean(errors.expireAfterValue)}
        error={errors.expireAfterValue}
        fullWidth
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldNumber
              value={retention.expireAfterValue || ''}
              onBlur={() => setTouched({ ...touched, expireAfterValue: true })}
              onChange={(e) => {
                const value = e.target.value;
                updatePolicyRetention({
                  expireAfterValue: value !== '' ? Number(value) : value,
                });
              }}
              data-test-subj="expireAfterValueInput"
              min={0}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              value={retention.expireAfterUnit}
              options={getExpirationTimeOptions(
                retention.expireAfterValue ? retention.expireAfterValue.toString() : undefined
              )}
              onChange={(e) => {
                updatePolicyRetention({
                  expireAfterUnit: e.target.value,
                });
              }}
              data-test-subj="expireAfterUnitSelect"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderCountFields = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepRetention.countTitle"
              defaultMessage="Snapshots to retain"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepRetention.countDescription"
          defaultMessage="The minimum and maximum number of snapshots to store for the policy."
        />
      }
      fullWidth
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetention.minCountLabel"
                defaultMessage="Mininum count"
              />
            }
            isInvalid={touched.minCount && Boolean(errors.minCount)}
            error={errors.minCount}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              value={retention.minCount || ''}
              onBlur={() => setTouched({ ...touched, minCount: true })}
              onChange={(e) => {
                const value = e.target.value;
                updatePolicyRetention({
                  minCount: value !== '' ? Number(value) : value,
                });
              }}
              data-test-subj="minCountInput"
              min={0}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetention.maxCountLabel"
                defaultMessage="Maximum count"
              />
            }
            isInvalid={touched.maxCount && Boolean(errors.maxCount)}
            error={errors.maxCount}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              value={retention.maxCount || ''}
              onBlur={() => setTouched({ ...touched, maxCount: true })}
              onChange={(e) => {
                const value = e.target.value;
                updatePolicyRetention({
                  maxCount: value !== '' ? Number(value) : value,
                });
              }}
              data-test-subj="maxCountInput"
              min={0}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescribedFormGroup>
  );

  return (
    <Fragment>
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetentionTitle"
                defaultMessage="Snapshot retention (optional)"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={docLinks.links.snapshotRestore.createSnapshot}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepRetention.docsButtonLabel"
              defaultMessage="Snapshot docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {renderExpireAfterField()}
      {renderCountFields()}
    </Fragment>
  );
};
