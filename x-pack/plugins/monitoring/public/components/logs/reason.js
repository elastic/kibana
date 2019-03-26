/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiLink
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const Reason = ({ reason }) => {
  let title;
  let message;

  if (false === reason.indexPatternExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noIndexPatternTitle', {
      defaultMessage: 'No filebeat indices found.'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noIndexPatternMessage"
        defaultMessage="Follow {link} to set it up. Please be sure to configure your Elasticsearch output to your monitoring cluster."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-installation.html">
              {i18n.translate('xpack.monitoring.logs.reason.noIndexPatternLink', {
                defaultMessage: 'these directions'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }
  else if (false === reason.indexPatternInTimeRangeExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noIndexPatternInTimePeriodTitle', {
      defaultMessage: 'No filebeat indices found in the selected time period.'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noIndexPatternInTimePeriodMessage"
        defaultMessage="Please adjust your time period as necessary"
      />
    );
  }
  else if (false === reason.typeExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noTypeTitle', {
      defaultMessage: 'We found filebeat indices but none for elasticsearch.'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noTypeMessage"
        defaultMessage="Follow {link} to set up the elasticsearch module."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-elasticsearch.html">
              {i18n.translate('xpack.monitoring.logs.reason.noTypeLink', {
                defaultMessage: 'these directions'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }
  else if (false === reason.clusterExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noClusterTitle', {
      defaultMessage: 'We did not find any logs for this cluster.'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noClusterMessage"
        defaultMessage="Ensure you have a filebeat instance reading from this cluster."
      />
    );
  }
  else if (false === reason.nodeExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noNodeTitle', {
      defaultMessage: 'We did not find any logs for this node.'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noNodeMessage"
        defaultMessage="Ensure you have a filebeat instance reading from this node."
      />
    );
  }
  else if (false === reason.indexExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noIndexTitle', {
      defaultMessage: 'We did not find any logs for this index.'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noIndexMessage"
        defaultMessage="Ensure you have a filebeat instance reading from all nodes in your cluster,
        or perhaps there are no logs for this index."
      />
    );
  }

  return (
    <EuiCallOut
      title={title}
      color="warning"
      iconType="help"
    >
      <p>{message}</p>
    </EuiCallOut>
  );
};
