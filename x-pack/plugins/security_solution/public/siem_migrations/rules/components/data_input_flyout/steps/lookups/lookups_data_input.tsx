/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStepNumber,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnResourcesCreated } from '../../types';
import { getStatus } from '../common/get_status';
import * as i18n from './translations';
import { DataInputStep } from '../constants';
import { SubSteps } from '../common/sub_step';
import { useMissingLookupsListStep } from './sub_steps/missing_lookups_list';
import { useLookupsFileUploadStep } from './sub_steps/lookups_file_upload';

interface LookupsDataInputSubStepsProps {
  migrationStats: RuleMigrationTaskStats;
  missingLookups: string[];
  onLookupsCreated: OnResourcesCreated;
}
interface LookupsDataInputProps
  extends Omit<LookupsDataInputSubStepsProps, 'migrationStats' | 'missingLookups'> {
  dataInputStep: DataInputStep;
  migrationStats?: RuleMigrationTaskStats;
  missingLookups?: string[];
}
export const LookupsDataInput = React.memo<LookupsDataInputProps>(
  ({ dataInputStep, migrationStats, missingLookups, onLookupsCreated }) => {
    const dataInputStatus = useMemo(
      () => getStatus(DataInputStep.Lookups, dataInputStep),
      [dataInputStep]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStepNumber
                  titleSize="xs"
                  number={DataInputStep.Lookups}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <b>{i18n.LOOKUPS_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && migrationStats && missingLookups && (
            <>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.LOOKUPS_DATA_INPUT_DESCRIPTION}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <LookupsDataInputSubSteps
                  migrationStats={migrationStats}
                  missingLookups={missingLookups}
                  onLookupsCreated={onLookupsCreated}
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
LookupsDataInput.displayName = 'LookupsDataInput';

const END = 10 as const;
type SubStep = 1 | 2 | typeof END;
export const LookupsDataInputSubSteps = React.memo<LookupsDataInputSubStepsProps>(
  ({ migrationStats, missingLookups, onLookupsCreated }) => {
    const [subStep, setSubStep] = useState<SubStep>(1);
    const [uploadedLookups, setUploadedLookups] = useState<Record<string, true>>({});
    const addUploadedLookups = useCallback((lookupNames: string[]) => {
      setUploadedLookups((prevUploadedLookups) => ({
        ...prevUploadedLookups,
        ...Object.fromEntries(lookupNames.map((lookupName) => [lookupName, true])),
      }));
    }, []);

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
    }, []);
    const copyStep = useMissingLookupsListStep({
      status: getStatus(1, subStep),
      missingLookups,
      uploadedLookups,
      onCopied,
    });

    // Upload macros step
    const onLookupsCreatedStep = useCallback<OnResourcesCreated>(() => {
      onLookupsCreated();
      setSubStep(END);
    }, [onLookupsCreated]);

    const uploadStep = useLookupsFileUploadStep({
      status: getStatus(2, subStep),
      migrationStats,
      missingLookups,
      addUploadedLookups,
      onLookupsCreated: onLookupsCreatedStep,
    });

    const steps = useMemo<EuiStepProps[]>(() => [copyStep, uploadStep], [copyStep, uploadStep]);

    return <SubSteps steps={steps} />;
  }
);
LookupsDataInputSubSteps.displayName = 'LookupsDataInputActive';
