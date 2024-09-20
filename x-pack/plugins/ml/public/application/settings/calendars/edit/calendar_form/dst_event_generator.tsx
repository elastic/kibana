/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiButton, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { createDstEvents } from '../../dst_utils';

interface Props {
  addEvents: (events: estypes.MlCalendarEvent[]) => void;
}

export const DstEventGenerator: FC<Props> = ({ addEvents }) => {
  const generateEvents = () => {
    //
    // const dates = createDstEvents('Europe/London');
    if (selectedTimeZones.length === 0) {
      return;
    }
    const events = createDstEvents(selectedTimeZones[0].value!);
    addEvents(events);
  };
  const [selectedTimeZones, setSelectedTimeZones] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const timeZoneOptions = useMemo(() => {
    return moment.tz.names().map((tz) => {
      return {
        label: tz,
        value: tz,
      };
    });
  }, []);

  // useEffect(() => {
  //   console.log(timeZoneOptions);
  // }, [timeZoneOptions]);

  return (
    <>
      <EuiFlexGroup wrap gutterSize="s">
        <EuiFlexItem grow={false} css={{ width: '400px' }}>
          <EuiComboBox
            placeholder="Select time zone"
            singleSelection={{ asPlainText: true }}
            options={timeZoneOptions}
            selectedOptions={selectedTimeZones}
            onChange={setSelectedTimeZones}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            key="ml_import_event"
            data-test-subj="mlCalendarImportEventsButton"
            iconType="importAction"
            onClick={generateEvents}
            isDisabled={selectedTimeZones.length === 0}
          >
            <FormattedMessage
              id="xpack.ml.calendarsEdit.eventsTable.importEventsButtonLabel"
              defaultMessage="Generate DST events"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
