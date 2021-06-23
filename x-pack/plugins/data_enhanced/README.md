# data_enhanced

The `data_enhanced` plugin is the x-pack counterpart to the `src/plguins/data` plugin.

It exists to provide services, or parts of services, which
enhance existing functionality from `src/plugins/data`.

Currently, the `data_enhanced` plugin doesn't return any APIs which you can
consume directly, however it is possible that you are indirectly relying on the
enhanced functionality that it provides via the `data` plugin from `src/`.

Here is the functionality it adds:

## Search Sessions

Search sessions are handy when you want to enable a user to run something asynchronously (for example, a dashboard over a long period of time), and then quickly restore the results at a later time. The Search Service transparently fetches results from the .async-search index, instead of running each request again.
