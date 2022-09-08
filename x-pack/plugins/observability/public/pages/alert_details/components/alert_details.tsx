/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAppServices } from '../../../application/types';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { paths } from '../../../config/paths';
import { useParams } from 'react-router';
import { AlertDetailsPathParams } from '../types';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { CenterJustifiedSpinner } from '../../rule_details/components/center_justified_spinner';
import { AlertSummary } from './';
import { useFetchAlert, FetchAlertArgs } from './hooks/use_fetch_alert';
import { useFetchRule } from '@kbn/observability-plugin/public/hooks/use_fetch_rule';
import { useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';

export function AlertDetails() {
    const { http } = useKibana<ObservabilityAppServices>().services;
    const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
    const { alertId, ruleId } = useParams<AlertDetailsPathParams>();
    const [features, setFeatures] = useState<string>('');

    const filteredRuleTypes = useMemo(
        () => observabilityRuleTypeRegistry.list(),
        [observabilityRuleTypeRegistry]
    );

    const { rule } = useFetchRule({ ruleId, http });
    const { ruleTypes } = useLoadRuleTypes({ filteredRuleTypes });

    useEffect(() => {
        if (ruleTypes.length && rule) {
            const matchedRuleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);

            if (rule.consumer === ALERTS_FEATURE_ID && matchedRuleType && matchedRuleType.producer) {
                setFeatures(matchedRuleType.producer);
            } else setFeatures(rule.consumer);
        }
    }, [rule, ruleTypes]);

    useBreadcrumbs([
        {
            href: http.basePath.prepend(paths.observability.alerts),
            text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
                defaultMessage: 'Alerts',
            }),
        },
    ]);

    const query = {
        size: 1,
        bool: {
            filter: [
                {
                    term: {
                        'kibana.alert.uuid': alertId
                    },
                },
            ],
        },
    };

    const fetchAlertArgs: FetchAlertArgs = {
        featureIds: [features] as AlertConsumers[],
        query
    };

    const [isLoading, { alert }] = useFetchAlert(fetchAlertArgs);

    if (isLoading) {
        return (
            <CenterJustifiedSpinner />
        )
    }

    if (!isLoading && !alert)
        return (
            <EuiPanel>
                <EuiEmptyPrompt
                    iconType="alert"
                    color="danger"
                    title={
                        <h2>
                            {i18n.translate('xpack.observability.alertDetails.errorPromptTitle', {
                                defaultMessage: 'Unable to load alert details',
                            })}
                        </h2>
                    }
                    body={
                        <p>
                            {i18n.translate('xpack.observability.alertDetails.errorPromptBody', {
                                defaultMessage: 'There was an error loading the alert details.',
                            })}
                        </p>
                    }
                />
            </EuiPanel>
        );

    return (
        <ObservabilityPageTemplate data-test-subj="alertDetails">
            <AlertSummary alert={alert} />
        </ObservabilityPageTemplate>
    );
}
