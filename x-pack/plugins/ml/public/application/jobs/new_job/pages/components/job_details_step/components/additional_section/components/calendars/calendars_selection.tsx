/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiComboBoxProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';
import { ml } from '../../../../../../../../../services/ml_api_service';
import { PLUGIN_ID } from '../../../../../../../../../../../common/constants/app';
import { Calendar } from '../../../../../../../../../../../common/types/calendars';
import { useMlKibana } from '../../../../../../../../../contexts/kibana';
import { GLOBAL_CALENDAR } from '../../../../../../../../../../../common/constants/calendars';

export const CalendarsSelection: FC = () => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useMlKibana();

  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [selectedCalendars, setSelectedCalendars] = useState<Calendar[]>(jobCreator.calendars);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<Calendar>>>(
    []
  );
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<Calendar>>>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadCalendars() {
    setIsLoading(true);
    const calendars = (await ml.calendars()).filter(
      (c) => c.job_ids.includes(GLOBAL_CALENDAR) === false
    );
    setOptions(calendars.map((c) => ({ label: c.calendar_id, value: c })));
    setSelectedOptions(selectedCalendars.map((c) => ({ label: c.calendar_id, value: c })));
    setIsLoading(false);
  }

  useEffect(() => {
    loadCalendars();
  }, []);

  useEffect(() => {
    jobCreator.calendars = selectedCalendars;
    jobCreatorUpdate();
  }, [selectedCalendars.join()]);

  const comboBoxProps: EuiComboBoxProps<Calendar> = {
    async: true,
    options,
    selectedOptions,
    isLoading,
    onChange: (optionsIn) => {
      setSelectedOptions(optionsIn);
      setSelectedCalendars(optionsIn.map((o) => o.value!));
    },
  };

  const manageCalendarsHref = getUrlForApp(PLUGIN_ID, {
    path: '/settings/calendars_list',
  });

  return (
    <Description>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem>
          <EuiComboBox {...comboBoxProps} data-test-subj="mlJobWizardComboBoxCalendars" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="right"
            content={
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.refreshCalendarsButtonLabel"
                defaultMessage="Refresh calendars"
              />
            }
          >
            <EuiButtonIcon
              iconType="refresh"
              color="primary"
              aria-label={i18n.translate(
                'xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.refreshCalendarsButtonLabel',
                {
                  defaultMessage: 'Refresh calendars',
                }
              )}
              onClick={loadCalendars}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <EuiLink href={manageCalendarsHref} target="_blank" external>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.manageCalendarsButtonLabel"
            defaultMessage="Manage calendars"
          />
        </EuiLink>
      </EuiText>
    </Description>
  );
};
