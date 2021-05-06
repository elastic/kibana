/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../../../../../app_context';

const i18nTexts = {
  indexClosedWarning: {
    title: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.reindexing.indexClosedWarning.calloutTitle',
      { defaultMessage: 'Index closed' }
    ),
    getDescription: (openIndexDocLink: string) => (
      <FormattedMessage
        id="xpack.upgradeAssistant.esDeprecations.reindexing.indexClosedWarning.calloutDescription"
        defaultMessage="This index is currently closed. The Upgrade Assistant will open, reindex and then close the index. {reindexingMayTakeLongerEmph}. Please see the {docs} for more information."
        values={{
          docs: (
            <EuiLink target="_blank" href={openIndexDocLink}>
              {i18n.translate(
                'xpack.upgradeAssistant.esDeprecations.reindexing.indexClosedWarning.calloutDescription.openAndCloseDocumentationLinkLabel',
                { defaultMessage: 'documentation' }
              )}
            </EuiLink>
          ),
          reindexingMayTakeLongerEmph: (
            <b>
              {i18n.translate(
                'xpack.upgradeAssistant.esDeprecations.reindexing.indexClosedWarning.calloutDescription.reindexingTakesLongerEmphasis',
                { defaultMessage: 'Reindexing may take longer than usual' }
              )}
            </b>
          ),
        }}
      />
    ),
  },
  readonlyWarning: {
    title: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.reindexing.readonlyWarning.calloutTitle',
      { defaultMessage: 'Index is unable to ingest, update, or delete documents while reindexing' }
    ),
    description: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.reindexing.readonlyWarning.calloutDescription',
      {
        defaultMessage:
          'If you can’t stop document updates or need to reindex into a new cluster, consider using a different upgrade strategy.',
      }
    ),
    secondaryDescription: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.reindexing.readonlyWarning.calloutDescription',
      {
        defaultMessage:
          'Reindexing will continue in the background, but if Kibana shuts down or restarts you will need to return to this page to resume reindexing.',
      }
    ),
  },
  unauthorizedWarning: {
    title: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.reindexing.unauthorizedWarning.calloutTitle',
      { defaultMessage: 'You do not have sufficient privileges to reindex this index' }
    ),
  },
};

interface Props {
  showIndexClosedWarning: boolean;
  showUnauthorizedWarning: boolean;
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const ReindexWarnings: React.FunctionComponent<Props> = ({
  showIndexClosedWarning,
  showUnauthorizedWarning,
}) => {
  const { docLinks } = useAppContext();

  return (
    <>
      {showIndexClosedWarning && (
        <>
          <EuiCallOut title={i18nTexts.unauthorizedWarning.title} color="danger" iconType="alert" />

          <EuiSpacer size="m" />
        </>
      )}

      <EuiCallOut title={i18nTexts.readonlyWarning.title} color="warning" iconType="alert">
        <p>{i18nTexts.readonlyWarning.description}</p>
        <p>{i18nTexts.readonlyWarning.secondaryDescription}</p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      {showIndexClosedWarning && (
        <>
          <EuiCallOut title={i18nTexts.indexClosedWarning.title} color="warning" iconType="alert">
            <p>{i18nTexts.indexClosedWarning.getDescription(docLinks.links.apis.openIndex)}</p>
          </EuiCallOut>

          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};
