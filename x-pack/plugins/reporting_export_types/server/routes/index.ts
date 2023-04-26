import { ReportingCore } from '@kbn/reporting-plugin/server';
import type { Logger } from '@kbn/core/server';
import { registerDiagnosticRoutes } from './diagnostic';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerDiagnosticRoutes(reporting, logger);
}
