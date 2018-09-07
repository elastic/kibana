const notifierProto = {
  error: msg => `error: ${msg}`,
  warning: msg => `warning: ${msg}`,
  info: msg => `info: ${msg}`,
};

export class Notifier {
  constructor() {
    Object.assign(this, notifierProto);
  }
}
