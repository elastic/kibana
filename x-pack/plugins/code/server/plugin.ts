import moment from 'moment';
import { map } from 'rxjs/operators';

import { Logger, PluginInitializerContext, PluginName, PluginSetupContext } from '../../../../src/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { init } from './init';


export class CodeConfig {
  public static schema = schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    queueIndex: schema.string({ defaultValue: '.code_internal-worker-queue' }),
    // 1 hour by default.
    queueTimeout: schema.number({ defaultValue: moment.duration(1, 'hour').asMilliseconds() }),
    // The frequency which update scheduler executes. 5 minutes by default.
    updateFrequencyMs: schema.number({ defaultValue: moment.duration(5, 'minute').asMilliseconds() }),
    // The frequency which index scheduler executes. 1 day by default.
    indexFrequencyMs: schema.number({ defaultValue: moment.duration(1, 'day').asMilliseconds() }),
    // The frequency which each repo tries to update. 1 hour by default.
    updateRepoFrequencyMs: schema.number({ defaultValue: moment.duration(1, 'hour').asMilliseconds() }),
    // The frequency which each repo tries to index. 1 day by default.
    indexRepoFrequencyMs: schema.number({ defaultValue: moment.duration(1, 'day').asMilliseconds() }),
    lsp: schema.object({
      // timeout of a request
      requestTimeoutMs: schema.number({ defaultValue: moment.duration(10, 'second').asMilliseconds() }),
      // if we want the language server run in seperately
      detach: schema.boolean({ defaultValue: false }),
      // whether we want to show more language server logs
      verbose: schema.boolean({ defaultValue: false }),
    }),
    repos: schema.arrayOf(schema.string(), { defaultValue: [] }),
    security: schema.object({
      enableMavenImport: schema.boolean({ defaultValue: true }),
      enableGradleImport: schema.boolean({ defaultValue: false }),
      installNodeDependency: schema.boolean({ defaultValue: true }),
      gitHostWhitelist: schema.arrayOf(
        schema.string(),
        {
          defaultValue: [
            'github.com',
            'gitlab.com',
            'bitbucket.org',
            'gitbox.apache.org',
            'eclipse.org',
        ]}
      ),
      gitProtocolWhitelist: schema.arrayOf(
        schema.string(),
        { defaultValue: ['https', 'git', 'ssh'] }
      )
    }),
    // max workspace folder for each language server
    maxWorkspace: schema.number({ defaultValue: 5 }),
    // Temp option to disable index scheduler.
    disableIndexScheduler: schema.boolean({ defaultValue: true }),
    // Global reference as optional feature for now
    enableGlobalReference: schema.boolean({ defaultValue: false }),
    codeNode: schema.boolean({ defaultValue: false }),
  });

  public readonly queueIndex: string;

  constructor(config: TypeOf<typeof CodeConfig['schema']>) {
    this.queueIndex = config.queueIndex;
  }
}


export class Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
    this.log.info('Code init');
  }

  public setup(setupContext: PluginSetupContext, deps: Record<PluginName, unknown>) {
    this.log.info('Code setup');
    this.log.error(
      `Setting up TestBed with core contract [${Object.keys(setupContext)}] and deps [${Object.keys(
        deps
      )}]`
    );

    return {
      data$: this.initializerContext.config.create(CodeConfig).pipe(
        map(config => {
          this.log.error(config.queueIndex);
          // init(core.http.server, config )
          return config.queueIndex;
        })
      )
    }
  }

  public stop() {
    this.log.info('Code stopped')
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}