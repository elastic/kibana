/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { memo } from 'react';
import {
  EuiAccordion,
  EuiSpacer,
  EuiDescriptionList,
  EuiTitle,
  EuiText,
  EuiHealth,
} from '@elastic/eui';
import { FormattedDate } from 'react-intl';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';

export const AlertDetailsOverview = memo(() => {
  const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
  if (alertDetailsData === undefined) {
    return null;
  }

  const AlertDetailsDate = useMemo(() => {
    const date = new Date(alertDetailsData['@timestamp']);
    return (
      <FormattedDate
        value={date}
        year="numeric"
        month="2-digit"
        day="2-digit"
        hour="2-digit"
        minute="2-digit"
        second="2-digit"
      />
    );
  }, [alertDetailsData]);

  const alertDetailsColumns = useMemo(() => {
    return [
      {
        title: 'Alert Type',
        description: 'TODO',
      },
      {
        title: 'Event Type',
        description: alertDetailsData.event.action,
      },
      {
        title: 'Status',
        description: 'TODO',
      },
      {
        title: 'Severity',
        description: 'TODO',
      },
      {
        title: 'Date Created',
        description: AlertDetailsDate,
      },
      {
        title: 'MalwareScore',
        description: alertDetailsData.file_classification.malware_classification.score,
      },
      {
        title: 'File Name',
        description: 'TODO',
      },
      {
        title: 'File Status',
        description: 'TODO',
      },
      {
        title: 'File Type',
        description: 'TODO',
      },
    ];
  }, [AlertDetailsDate, alertDetailsData]);

  const hostDetailsColumns = useMemo(() => {
    return [
      {
        title: 'Host Name',
        description: alertDetailsData.host.hostname,
      },
      {
        title: 'Host IP',
        description: alertDetailsData.host.ip,
      },
      {
        title: 'Status',
        description: 'TODO',
      },
      {
        title: 'OS',
        description: alertDetailsData.host.os.name,
      },
      {
        title: 'Alert Count',
        description: 'TODO',
      },
    ];
  }, [alertDetailsData]);

  const hashDetailsColumns = useMemo(() => {
    return [
      {
        title: 'MD5',
        description: 'TODO',
      },
      {
        title: 'SHA1',
        description: 'TODO',
      },
      {
        title: 'SHA256',
        description: 'TODO',
      },
    ];
  }, []);

  const fileDetailsColumns = useMemo(() => {
    return [
      {
        title: 'File Name',
        description: 'TODO',
      },
      {
        title: 'File Path',
        description: 'TODO',
      },
      {
        title: 'File Size',
        description: 'TODO',
      },
      {
        title: 'File Created',
        description: 'TODO',
      },
      {
        title: 'File Modified',
        description: 'TODO',
      },
      {
        title: 'File Accessed',
        description: 'TODO',
      },
      {
        title: 'Signer',
        description: 'TODO',
      },
      {
        title: 'Owner',
        description: 'TODO',
      },
    ];
  }, []);

  const sourceProcessDetailsColumns = useMemo(() => {
    return [
      {
        title: 'Process ID',
        description: 'TODO',
      },
      {
        title: 'Process Name',
        description: 'TODO',
      },
      {
        title: 'Process Path',
        description: 'TODO',
      },
      {
        title: 'MD5',
        description: 'TODO',
      },
      {
        title: 'SHA1',
        description: 'TODO',
      },
      {
        title: 'SHA256',
        description: 'TODO',
      },
      {
        title: 'MalwareScore',
        description: 'TODO',
      },
      {
        title: 'Parent Process ID',
        description: 'TODO',
      },
      {
        title: 'Signer',
        description: 'TODO',
      },
      {
        title: 'Username',
        description: 'TODO',
      },
      {
        title: 'Domain',
        description: 'TODO',
      },
    ];
  }, []);

  const sourceProcessTokenDetailsColumns = useMemo(() => {
    return [
      {
        title: 'SID',
        description: 'TODO',
      },
      {
        title: 'Integrity Level',
        description: 'TODO',
      },
      {
        title: 'Privileges',
        description: 'TODO',
      },
    ];
  }, []);

  return (
    <>
      {/* Hard coded top level alert details component. TODO: maybe abstract somewhere else? */}
      <EuiTitle size="s">
        <h3>Detected Malicious File</h3>
      </EuiTitle>
      <EuiSpacer />
      <EuiText>
        <p>
          Endgame MalwareScore detected the opening of a document with a blah blah blah on{' '}
          {alertDetailsData.host.hostname} on {AlertDetailsDate}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiText>
        Endpoint Status: <EuiHealth color="success">Online</EuiHealth>
      </EuiText>
      <EuiSpacer />
      <EuiText>Alert Status: Open</EuiText>
      <EuiSpacer />

      {/* Start of Alert Details overview component TODO: delete this comment eventually */}
      <EuiAccordion
        id="alertDetailsAlertAccordion"
        buttonContent="Alert"
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList
          type="column"
          listItems={alertDetailsColumns}
          style={{ maxWidth: '400px' }}
        />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsHostAccordion"
        buttonContent="Host"
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList
          type="column"
          listItems={hostDetailsColumns}
          style={{ maxWidth: '400px' }}
        />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsHashAccordion"
        buttonContent="Hash"
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList
          type="column"
          listItems={hashDetailsColumns}
          style={{ maxWidth: '400px' }}
        />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsFileAccordion"
        buttonContent="File"
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList
          type="column"
          listItems={fileDetailsColumns}
          style={{ maxWidth: '400px' }}
        />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsSourceProcessAccordion"
        buttonContent="Source Process"
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList
          type="column"
          listItems={sourceProcessDetailsColumns}
          style={{ maxWidth: '400px' }}
        />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsSourceProcessTokenAccordion"
        buttonContent="Source Process Token"
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList
          type="column"
          listItems={sourceProcessTokenDetailsColumns}
          style={{ maxWidth: '400px' }}
        />
      </EuiAccordion>
    </>
  );
});
