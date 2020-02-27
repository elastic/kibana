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
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.alertType', {
          defaultMessage: 'Alert Type',
        }),
        description: alertDetailsData.event.category,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.eventType', {
          defaultMessage: 'Event Type',
        }),
        description: alertDetailsData.event.kind,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.status', {
          defaultMessage: 'Status',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.severity', {
          defaultMessage: 'Severity',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.dateCreated', {
          defaultMessage: 'Date Created',
        }),
        description: dateFormatter.format(new Date(alertDetailsData['@timestamp'])),
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.malwareScore', {
          defaultMessage: 'MalwareScore',
        }),
        description: alertDetailsData.file_classification.malware_classification.score,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileName', {
          defaultMessage: 'File Name',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileStatus', {
          defaultMessage: 'File Status',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileType', {
          defaultMessage: 'File Type',
        }),
        description: 'TODO',
      },
    ];
  }, [alertDetailsData, dateFormatter]);

  const hostDetailsColumns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.hostName', {
          defaultMessage: 'Host Name',
        }),
        description: alertDetailsData.host.hostname,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.hostIP', {
          defaultMessage: 'Host IP',
        }),
        description: alertDetailsData.host.ip,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.status', {
          defaultMessage: 'Status',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.os', {
          defaultMessage: 'OS',
        }),
        description: alertDetailsData.host.os.name,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.alertCount', {
          defaultMessage: 'Alert Count',
        }),
        description: 'TODO',
      },
    ];
  }, [alertDetailsData]);

  const hashDetailsColumns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.md5', {
          defaultMessage: 'MD5',
        }),
        description: alertDetailsData.file.hash.md5,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sha1', {
          defaultMessage: 'SHA1',
        }),
        description: alertDetailsData.file.hash.sha1,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sha256', {
          defaultMessage: 'SHA256',
        }),
        description: alertDetailsData.file.hash.sha256,
      },
    ];
  }, [alertDetailsData]);

  const fileDetailsColumns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileName', {
          defaultMessage: 'File Name',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.filePath', {
          defaultMessage: 'File Path',
        }),
        description: alertDetailsData.file.path,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileSize', {
          defaultMessage: 'File Size',
        }),
        description: alertDetailsData.file.size,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileCreated', {
          defaultMessage: 'File Created',
        }),
        description: dateFormatter.format(new Date(alertDetailsData.file.created)),
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileModified', {
          defaultMessage: 'File Modified',
        }),
        description: dateFormatter.format(new Date(alertDetailsData.file.mtime)),
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileAccessed', {
          defaultMessage: 'File Accessed',
        }),
        description: dateFormatter.format(new Date(alertDetailsData.file.accessed)),
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.signer', {
          defaultMessage: 'Signer',
        }),
        description: alertDetailsData.file_classification.signature_signer,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.owner', {
          defaultMessage: 'Owner',
        }),
        description: alertDetailsData.file.owner,
      },
    ];
  }, [alertDetailsData, dateFormatter]);

  const sourceProcessDetailsColumns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.processID', {
          defaultMessage: 'Process ID',
        }),
        description: alertDetailsData.process.pid, // TODO: Change me
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.processName', {
          defaultMessage: 'Process Name',
        }),
        description: alertDetailsData.process.name,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.processPath', {
          defaultMessage: 'Process Path',
        }),
        description: alertDetailsData.process.executable,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.md5', {
          defaultMessage: 'MD5',
        }),
        description: alertDetailsData.process.hash.md5,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sha1', {
          defaultMessage: 'SHA1',
        }),
        description: alertDetailsData.process.hash.sha1,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sha256', {
          defaultMessage: 'SHA256',
        }),
        description: alertDetailsData.process.hash.sha256,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.malwareScore', {
          defaultMessage: 'MalwareScore',
        }),
        description: alertDetailsData.process.malware_classification.score,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.parentProcessID', {
          defaultMessage: 'Parent Process ID',
        }),
        description: alertDetailsData.process.ppid, // TODO: Change me
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.signer', {
          defaultMessage: 'signer',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.username', {
          defaultMessage: 'Username',
        }),
        description: alertDetailsData.process.token.user, // TODO: Not sure about this
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.domain', {
          defaultMessage: 'Domain',
        }),
        description: alertDetailsData.process.token.domain,
      },
    ];
  }, [alertDetailsData]);

  const sourceProcessTokenDetailsColumns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sid', {
          defaultMessage: 'SID',
        }),
        description: alertDetailsData.process.token.sid,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.integrityLevel', {
          defaultMessage: 'Integrity Level',
        }),
        description: alertDetailsData.process.token.integrity_level,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.privileges', {
          defaultMessage: 'Privileges',
        }),
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
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.alert',
          {
            defaultMessage: 'Alert',
          }
        )}
        paddingSize="l"
        initialIsOpen={true}
      >
        <EuiDescriptionList type="column" listItems={alertDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsHostAccordion"
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.host',
          {
            defaultMessage: 'Host',
          }
        )}
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={hostDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsHashAccordion"
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.hash',
          {
            defaultMessage: 'Hash',
          }
        )}
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={hashDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsFileAccordion"
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.file',
          {
            defaultMessage: 'File',
          }
        )}
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={fileDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsSourceProcessAccordion"
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.sourceProcess',
          {
            defaultMessage: 'Source Process',
          }
        )}
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={sourceProcessDetailsColumns} />
      </EuiAccordion>

      <EuiSpacer />

      <EuiAccordion
        id="alertDetailsSourceProcessTokenAccordion"
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.sourceProcessToken',
          {
            defaultMessage: 'Source Process Token',
          }
        )}
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={sourceProcessTokenDetailsColumns} />
      </EuiAccordion>
    </>
  );
});
