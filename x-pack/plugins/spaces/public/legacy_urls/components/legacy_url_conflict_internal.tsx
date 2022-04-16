/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { first } from 'rxjs/operators';

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_OBJECT_NOUN } from '../../constants';
import type { PluginsStart } from '../../plugin';
import type { LegacyUrlConflictProps } from '../types';

export interface InternalProps {
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const LegacyUrlConflictInternal = (props: InternalProps & LegacyUrlConflictProps) => {
  const {
    getStartServices,
    objectNoun = DEFAULT_OBJECT_NOUN,
    currentObjectId,
    otherObjectId,
    otherObjectPath,
  } = props;

  const [isDismissed, setIsDismissed] = useState(false);

  const { value: asyncParams } = useAsync(async () => {
    const [{ application: applicationStart, docLinks }] = await getStartServices();
    const appId = await applicationStart.currentAppId$.pipe(first()).toPromise(); // retrieve the most recent value from the BehaviorSubject
    const docLink = docLinks.links.spaces.kibanaLegacyUrlAliases;
    return { applicationStart, appId, docLink };
  }, [getStartServices]);
  const { docLink, applicationStart, appId } = asyncParams ?? {};

  if (!applicationStart || !appId || !docLink || isDismissed) {
    return null;
  }

  function clickLinkButton() {
    applicationStart!.navigateToApp(appId!, { path: otherObjectPath });
  }

  function clickDismissButton() {
    setIsDismissed(true);
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="help"
      title={
        <FormattedMessage
          id="xpack.spaces.legacyUrlConflict.calloutTitle"
          defaultMessage="2 saved objects use this URL"
        />
      }
    >
      <FormattedMessage
        id="xpack.spaces.legacyUrlConflict.calloutBodyText"
        defaultMessage="Check that this is the {objectNoun} that you are looking for. Otherwise, go to the other one. {documentationLink}"
        values={{
          objectNoun,
          documentationLink: (
            <EuiLink external href={docLink} target="_blank">
              {i18n.translate('xpack.spaces.legacyUrlConflict.documentationLinkText', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          ),
        }}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            delay="long"
            content={i18n.translate('xpack.spaces.legacyURLConflict.toolTipText', {
              defaultMessage:
                'This {objectNoun} has [id={currentObjectId}]. The other {objectNoun} has [id={otherObjectId}].',
              values: { objectNoun, currentObjectId, otherObjectId },
            })}
          >
            <EuiButton
              color="warning"
              size="s"
              onClick={clickLinkButton}
              data-test-subj="legacy-url-conflict-go-to-other-button"
            >
              <FormattedMessage
                id="xpack.spaces.legacyUrlConflict.linkButton"
                defaultMessage="Go to other {objectNoun}"
                values={{ objectNoun }}
              />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="warning"
            size="s"
            onClick={clickDismissButton}
            data-test-subj="legacy-url-conflict-dismiss-button"
          >
            <FormattedMessage
              id="xpack.spaces.legacyUrlConflict.dismissButton"
              defaultMessage="Dismiss"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
