declare module 'datemath-parser' {
  interface DateMath {
    parse(expression: string, now: number, roundUp: boolean, timeZone?: string): number;
  }
  const datemath: DateMath;
  export = datemath;
}
