export const buildConfig = async (
  core: CoreSetup,
  logger: Logger
): Promise<ReportingConfig> => {
  const config$ = initContext.config.create<ReportingConfigType>();
  const { http } = core;
  const serverInfo = http.getServerInfo();

  const kbnConfig = {
    server: {
      basePath: core.http.basePath.serverBasePath,
      host: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: initContext.env.instanceUuid,
      protocol: serverInfo.protocol,
    },
  };

  const reportingConfig$ = createConfig$(core, config$, logger);
  const reportingConfig = await reportingConfig$.pipe(first()).toPromise();
  return {
    get: (...keys: string[]) => get(reportingConfig, keys.join('.'), null), // spreading arguments as an array allows the return type to be known by the compiler
    kbnConfig: {
      get: (...keys: string[]) => get(kbnConfig, keys.join('.'), null),
    },
  };
};
