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
import { i18n } from '@kbn/i18n';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';

export const AlertDetailsOverview = memo(() => {
  const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
  if (alertDetailsData === undefined) {
    return null;
  }

  // TODO decide which version to keep
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

  const dateFormatter = new Intl.DateTimeFormat(i18n.getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // TODO fix this style
  const TokenPrivileges = useMemo(() => {
    const privileges: Array<{ title: string; description: string }> = [];
    alertDetailsData.process.token.privileges.map(({ name, description }) => {
      privileges.push({ title: name, description });
    });
    return (
      <>
        <EuiAccordion id="accordion4" buttonContent="Privileges">
          <EuiDescriptionList type="column" listItems={privileges} />
        </EuiAccordion>
      </>
    );
  }, [alertDetailsData.process.token.privileges]);

  const alertDetailsColumns = useMemo(() => {
    return [
      {
        title: 'Alert Type',
        description: alertDetailsData.event.category,
      },
      {
        title: 'Event Type',
        description: alertDetailsData.event.kind,
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
        description: dateFormatter.format(new Date(alertDetailsData['@timestamp'])),
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
  }, [alertDetailsData, dateFormatter]);

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
        description: alertDetailsData.file.hash.md5,
      },
      {
        title: 'SHA1',
        description: alertDetailsData.file.hash.sha1,
      },
      {
        title: 'SHA256',
        description: alertDetailsData.file.hash.sha256,
      },
    ];
  }, [alertDetailsData]);

  const fileDetailsColumns = useMemo(() => {
    return [
      {
        title: 'File Name',
        description: 'TODO',
      },
      {
        title: 'File Path',
        description: alertDetailsData.file.path,
      },
      {
        title: 'File Size',
        description: alertDetailsData.file.size,
      },
      {
        title: 'File Created',
        description: dateFormatter.format(new Date(alertDetailsData.file.created)),
      },
      {
        title: 'File Modified',
        description: dateFormatter.format(new Date(alertDetailsData.file.mtime)),
      },
      {
        title: 'File Accessed',
        description: dateFormatter.format(new Date(alertDetailsData.file.accessed)),
      },
      {
        title: 'Signer',
        description: alertDetailsData.file_classification.signature_signer,
      },
      {
        title: 'Owner',
        description: alertDetailsData.file.owner,
      },
    ];
  }, [alertDetailsData, dateFormatter]);

  const sourceProcessDetailsColumns = useMemo(() => {
    return [
      {
        title: 'Process ID',
        description: alertDetailsData.process.pid, // TODO: Change me
      },
      {
        title: 'Process Name',
        description: alertDetailsData.process.name,
      },
      {
        title: 'Process Path',
        description: alertDetailsData.process.executable,
      },
      {
        title: 'MD5',
        description: alertDetailsData.process.hash.md5,
      },
      {
        title: 'SHA1',
        description: alertDetailsData.process.hash.sha1,
      },
      {
        title: 'SHA256',
        description: alertDetailsData.process.hash.sha256,
      },
      {
        title: 'MalwareScore',
        description: alertDetailsData.process.malware_classification.score,
      },
      {
        title: 'Parent Process ID',
        description: alertDetailsData.process.ppid, // TODO: Change me
      },
      {
        title: 'Signer',
        description: 'TODO',
      },
      {
        title: 'Username',
        description: alertDetailsData.process.token.user, // TODO: Not sure about this
      },
      {
        title: 'Domain',
        description: alertDetailsData.process.token.domain,
      },
    ];
  }, [alertDetailsData]);

  const sourceProcessTokenDetailsColumns = useMemo(() => {
    return [
      {
        title: 'SID',
        description: alertDetailsData.process.token.sid,
      },
      {
        title: 'Integrity Level',
        description: alertDetailsData.process.token.integrity_level,
      },
      {
        title: 'Privileges',
        description: TokenPrivileges,
      },
    ];
  }, [
    TokenPrivileges,
    alertDetailsData.process.token.integrity_level,
    alertDetailsData.process.token.sid,
  ]);

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
        <EuiDescriptionList type="column" listItems={alertDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion id="alertDetailsHostAccordion" buttonContent="Host" paddingSize="l">
        <EuiDescriptionList type="column" listItems={hostDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion id="alertDetailsHashAccordion" buttonContent="Hash" paddingSize="l">
        <EuiDescriptionList type="column" listItems={hashDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion id="alertDetailsFileAccordion" buttonContent="File" paddingSize="l">
        <EuiDescriptionList type="column" listItems={fileDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsSourceProcessAccordion"
        buttonContent="Source Process"
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={sourceProcessDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsSourceProcessTokenAccordion"
        buttonContent="Source Process Token"
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={sourceProcessTokenDetailsColumns} />
      </EuiAccordion>
    </>
  );
});
