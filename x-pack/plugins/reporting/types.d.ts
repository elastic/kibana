export interface Size {
  width: number;
  height: number;
}
  
export interface Logger {
  debug: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}