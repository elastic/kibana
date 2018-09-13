export class ExpressionFormHandlers {
  constructor() {
    this.destroy = () => {};
    this.done = () => {};
  }

  onDestroy(fn) {
    this.destroy = fn;
  }
}
