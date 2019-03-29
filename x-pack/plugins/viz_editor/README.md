# Visualization Editor

This is the new visualization editor placeholder.


## Folder structure

* `viz_editor` The editor frame plugin which bootstraps the app and loads individual editor plugins
    * `public` Client side stuff (everything atm)
        * `app.tsx` Entrypoint for the editor app
        * `frame` Components and helpers which are only used by the frame itself and shouldn't be imported by individual editor plugins
        * `editor_plugin_registry.ts` Central registry for available editor plugins. Each editor plugin registers itself here to be picked up by the frame
        * `common` Components and helper methods which are often needed in various editors. Can be used by the individual editor plugins
            * `lib` Types and helper methods whithout UI (doing things like working with the viewmodel, creating expressions etc.)
            * `components` Common components which will be used often in individual editor plugins (e.g. dimension control panel, index pattern field list, ...)
        * `pseudo_plugins` This folder contains the various "plugins" which add functionality to the editor (This will eventually be moved into a separate kibana plugin once the new platform is available)
            * `<PLUGINNAME>_plugin` An individual editor plugin (This will eventually be moved into a separate kibana plugin once the new platform is available)
                * `<PLUGINNAME>_plugin.ts` The actual editorplugin definition which gets registered in the editor plugin registry
                * `<PLUGINNAME>_vis.ts` Various functions and renderers which get registered in the pipeline registries. These will be used to actually render the chart by kicking off an expression