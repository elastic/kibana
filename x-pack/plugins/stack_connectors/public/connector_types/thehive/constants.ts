import { i18n } from '@kbn/i18n';
import { TheHiveSeverity, TheHiveTLP } from '../../../common/thehive/constants';

export const eventActionOptions = [
    {
        value: 'case',
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectCreateCaseOptionLabel',
            {
                defaultMessage: 'Create Case',
            }
        ),
    },
    {
        value: 'alert',
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectCreateAlertOptionLabel',
            {
                defaultMessage: 'Create Alert',
            }
        ),
    }
];

export const severityOptions = [
    {
        value: TheHiveSeverity.LOW,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectSeverityLowOptionLabel',
            {
                defaultMessage: 'LOW',
            }
        )
    },
    {
        value: TheHiveSeverity.MEDIUM,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectSeverityMediumOptionLabel',
            {
                defaultMessage: 'MEDIUM',
            }
        ),
    },
    {
        value: TheHiveSeverity.HIGH,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectSeverityHighOptionLabel',
            {
                defaultMessage: 'HIGH',
            }
        ),
    },
    {
        value: TheHiveSeverity.CRITICAL,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectSeverityCriticalOptionLabel',
            {
                defaultMessage: 'CRITICAL',
            }
        ),
    },
];

export const tlpOptions = [
    {
        value: TheHiveTLP.CLEAR,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectTlpClearOptionLabel',
            {
                defaultMessage: 'CLEAR',
            }
        ),
    },
    {
        value: TheHiveTLP.GREEN,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectTlpGreenOptionLabel',
            {
                defaultMessage: 'GREEN',
            }
        ),
    },
    {
        value: TheHiveTLP.AMBER,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectTlpAmberOptionLabel',
            {
                defaultMessage: 'AMBER',
            }
        ),
    },
    {
        value: TheHiveTLP.AMBER_STRICT,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectTlpAmberStrictOptionLabel',
            {
                defaultMessage: 'AMBER+STRICT',
            }
        ),
    },
    {
        value: TheHiveTLP.RED,
        text: i18n.translate(
            'xpack.stackConnectors.components.thehive.eventSelectTlpRedOptionLabel',
            {
                defaultMessage: 'RED',
            }
        ),
    }
];
