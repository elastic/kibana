import {Logger} from "@kbn/logging";

export class AppLogger {
  private static instance: Logger;

  public static getInstance(): Logger {
    return AppLogger.instance;
  }

  public static setInstance(logger: Logger) {
    AppLogger.instance = logger;
  }
}
