export declare const createEditConfig: () => {
    title: string;
    textPre: string;
    commands: string[];
};
export declare function createStartServerUnixSysv(): {
    title: string;
    textPre: string;
    commands: string[];
};
export declare function createStartServerUnix(): {
    title: string;
    textPre: string;
    commands: string[];
};
export declare function createStartServerUnixBinari(): {
    title: string;
    textPre: string;
    commands: string[];
};
export declare const createDownloadServerOsx: () => {
    title: string;
    commands: string[];
};
export declare const createDownloadServerDeb: () => {
    title: string;
    commands: string[];
    textPost: string;
};
export declare const createDownloadServerRpm: () => {
    title: string;
    commands: string[];
    textPost: string;
};
export declare const createDownloadServerOtherLinux: () => {
    title: string;
    commands: string[];
};
export declare function createWindowsServerInstructions(): ({
    title: string;
    textPre: string;
    commands: string[];
} | {
    title: string;
    textPre: string;
    commands: string[];
    textPost: string;
})[];
