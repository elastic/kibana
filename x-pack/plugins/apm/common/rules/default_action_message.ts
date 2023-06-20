/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const errorCountMessage = i18n.translate(
  'xpack.apm.alertTypes.errorCount.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active with the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Error count: \\{\\{context.triggerValue\\}\\} errors over the last \\{\\{context.interval\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
export const errorCountRecoveryMessage = i18n.translate(
  'xpack.apm.alertTypes.errorCount.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} has recovered.

- Service name: \\{\\{context.serviceName\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Error count: \\{\\{context.triggerValue\\}\\} errors over the last \\{\\{context.interval\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

export const transactionDurationMessage = i18n.translate(
  'xpack.apm.alertTypes.transactionDuration.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active with the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Transaction type: \\{\\{context.transactionType\\}\\}
- Transaction name: \\{\\{context.transactionName\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Latency: \\{\\{context.triggerValue\\}\\} over the last \\{\\{context.interval\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}ms

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
export const transactionDurationRecoveryMessage = i18n.translate(
  'xpack.apm.alertTypes.transactionDuration.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} has recovered.

- Service name: \\{\\{context.serviceName\\}\\}
- Transaction type: \\{\\{context.transactionType\\}\\}
- Transaction name: \\{\\{context.transactionName\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Latency: \\{\\{context.triggerValue\\}\\} over the last \\{\\{context.interval\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}ms

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

export const transactionErrorRateMessage = i18n.translate(
  'xpack.apm.alertTypes.transactionErrorRate.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active with the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Transaction type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Failed transaction rate: \\{\\{context.triggerValue\\}\\}% of errors over the last \\{\\{context.interval\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}%

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
export const transactionErrorRateRecoveryMessage = i18n.translate(
  'xpack.apm.alertTypes.transactionErrorRate.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} has recovered.

- Service name: \\{\\{context.serviceName\\}\\}
- Transaction type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Failed transaction rate: \\{\\{context.triggerValue\\}\\}% of errors over the last \\{\\{context.interval\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}%

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

export const anomalyMessage = i18n.translate(
  'xpack.apm.alertTypes.transactionDurationAnomaly.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active with the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Transaction type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Severity: \\{\\{context.triggerValue\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
export const anomalyRecoveryMessage = i18n.translate(
  'xpack.apm.alertTypes.transactionDurationAnomaly.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} has recovered.

- Service name: \\{\\{context.serviceName\\}\\}
- Transaction type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Severity: \\{\\{context.triggerValue\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
